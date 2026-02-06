import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let token: string;
  let sessionId: string;
  let seatIds: string[];
  let reservationId: string;

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
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Flow: Session → Reservation → Payment', () => {
    describe('Step 1: User Registration', () => {
      it('should register a new user and return access token', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Flow Test User',
            email: `flow-test-${Date.now()}@test.com`,
            password: 'password123',
          })
          .expect(201);

        expect(res.body.accessToken).toBeDefined();
        token = res.body.accessToken;
      });
    });

    describe('Step 2: Create Session with Seats', () => {
      it('should create a new session with 16 seats', async () => {
        const seatLabels = Array.from({ length: 16 }, (_, i) => `A${i + 1}`);

        const res = await request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            movieTitle: 'Flow Test Movie',
            room: `Room-Flow-${Date.now()}`,
            startsAt: new Date(Date.now() + 86400000).toISOString(),
            ticketPriceInCents: 2500,
            seats: seatLabels,
          })
          .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body.movieTitle).toBe('Flow Test Movie');
        sessionId = res.body.id;
      });

      it('should return 16 available seats for the session', async () => {
        const res = await request(app.getHttpServer())
          .get(`/sessions/${sessionId}/seats/available`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.length).toBe(16);
        seatIds = res.body.slice(0, 2).map((s: { id: string }) => s.id);
      });
    });

    describe('Step 3: Reserve Seats', () => {
      it('should create a reservation for 2 seats', async () => {
        const res = await request(app.getHttpServer())
          .post('/reservations')
          .set('Authorization', `Bearer ${token}`)
          .send({ sessionId, seatIds })
          .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body.status).toBe('PENDING');
        expect(res.body.expiresAt).toBeDefined();
        reservationId = res.body.id;
      });

      it('should mark seats as RESERVED', async () => {
        const seats = await prisma.seat.findMany({
          where: { id: { in: seatIds } },
        });
        expect(seats.every((s) => s.status === 'RESERVED')).toBe(true);
      });
    });

    describe('Step 4: Confirm Payment', () => {
      it('should confirm payment and create a sale', async () => {
        const res = await request(app.getHttpServer())
          .post('/payments/confirm')
          .set('Authorization', `Bearer ${token}`)
          .send({ reservationId })
          .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body.totalInCents).toBe(5000); // 2 seats * 2500
      });

      it('should mark reservation as CONFIRMED', async () => {
        const reservation = await prisma.reservation.findUnique({
          where: { id: reservationId },
        });
        expect(reservation!.status).toBe('CONFIRMED');
      });

      it('should mark seats as SOLD', async () => {
        const seats = await prisma.seat.findMany({
          where: { id: { in: seatIds } },
        });
        expect(seats.every((s) => s.status === 'SOLD')).toBe(true);
      });
    });

    describe('Step 5: Verify Purchase History', () => {
      it('should show the sale in user purchase history', async () => {
        const res = await request(app.getHttpServer())
          .get('/payments/history')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.length).toBeGreaterThanOrEqual(1);
        const sale = res.body.find(
          (s: { reservationId: string }) => s.reservationId === reservationId,
        );
        expect(sale).toBeDefined();
      });
    });

    describe('Step 6: Sold Seats Cannot Be Reserved', () => {
      it('should reject reservation for sold seats', async () => {
        const newUserRes = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'Another User',
            email: `another-${Date.now()}@test.com`,
            password: 'password123',
          })
          .expect(201);

        const res = await request(app.getHttpServer())
          .post('/reservations')
          .set('Authorization', `Bearer ${newUserRes.body.accessToken}`)
          .send({ sessionId, seatIds })
          .expect(409);

        expect(res.body.message).toContain('reservados ou vendidos');
      });
    });
  });
});
