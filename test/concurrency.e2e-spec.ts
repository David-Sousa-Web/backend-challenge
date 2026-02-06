import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Concurrency – Seat Reservation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let sessionId: string;
  let seatId: string;
  let tokens: string[] = [];

  const NUM_USERS = 5;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    tokens = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: `User ${i}`,
          email: `concurrency-${Date.now()}-${i}@test.com`,
          password: 'password123',
        })
        .expect(201);

      tokens.push(res.body.accessToken);
    }

    const sessionRes = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        movieTitle: 'Concurrency Test Film',
        room: `Room-${Date.now()}`,
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        ticketPriceInCents: 2500,
        seats: Array.from({ length: 20 }, (_, i) => `S${i + 1}`),
      })
      .expect(201);

    sessionId = sessionRes.body.id;

    const seatsRes = await request(app.getHttpServer())
      .get(`/sessions/${sessionId}/seats/available`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .expect(200);

    seatId = seatsRes.body[0].id;
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('should allow only ONE reservation when N users race for the same seat', async () => {
    const results = await Promise.allSettled(
      tokens.map((token) =>
        request(app.getHttpServer())
          .post('/reservations')
          .set('Authorization', `Bearer ${token}`)
          .send({ sessionId, seatIds: [seatId] }),
      ),
    );

    const responses = results
      .filter(
        (r): r is PromiseFulfilledResult<request.Response> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value);

    const successes = responses.filter((r) => r.status === 201);
    const rejected = responses.filter(
      (r) => r.status === 409 || r.status === 500,
    );

    expect(successes.length).toBe(1);
    expect(rejected.length).toBe(NUM_USERS - 1);

    const seat = await prisma.seat.findUnique({ where: { id: seatId } });
    expect(seat!.status).toBe('RESERVED');
  }, 30_000);

  it('should prevent double-reservation of an already reserved seat', async () => {
    const res = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({ sessionId, seatIds: [seatId] });

    expect(res.status).toBe(409);
  });
});
