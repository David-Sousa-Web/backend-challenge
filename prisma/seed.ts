import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function main() {
  console.log('Seeding database...');

  const alice = await prisma.user.upsert({
    where: { email: 'alice@email.com' },
    update: {},
    create: {
      name: 'Alice',
      email: 'alice@email.com',
      passwordHash: await hashPassword('123456'),
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@email.com' },
    update: {},
    create: {
      name: 'Bob',
      email: 'bob@email.com',
      passwordHash: await hashPassword('123456'),
    },
  });

  console.log(`Users created: ${alice.name}, ${bob.name}`);

  const rooms = [
    {
      movieTitle: 'Vingadores: Ultimato',
      room: 'Sala 1',
      startsAt: new Date('2026-02-10T19:00:00.000Z'),
      ticketPriceInCents: 2500,
    },
    {
      movieTitle: 'Matrix Resurrections',
      room: 'Sala 2',
      startsAt: new Date('2026-02-10T21:00:00.000Z'),
      ticketPriceInCents: 3000,
    },
    {
      movieTitle: 'Interstellar',
      room: 'Sala 3',
      startsAt: new Date('2026-02-11T15:00:00.000Z'),
      ticketPriceInCents: 2000,
    },
  ];

  const seatLabels = [
    'A1',
    'A2',
    'A3',
    'A4',
    'A5',
    'A6',
    'A7',
    'A8',
    'B1',
    'B2',
    'B3',
    'B4',
    'B5',
    'B6',
    'B7',
    'B8',
    'C1',
    'C2',
    'C3',
    'C4',
    'C5',
    'C6',
    'C7',
    'C8',
    'D1',
    'D2',
    'D3',
    'D4',
    'D5',
    'D6',
    'D7',
    'D8',
  ];

  for (const room of rooms) {
    const existing = await prisma.session.findUnique({
      where: { room_startsAt: { room: room.room, startsAt: room.startsAt } },
    });

    if (existing) {
      console.log(`Session "${room.movieTitle}" already exists, skipping.`);
      continue;
    }

    const session = await prisma.session.create({
      data: {
        ...room,
        seats: {
          createMany: {
            data: seatLabels.map((label) => ({ label })),
          },
        },
      },
    });

    console.log(
      `Session created: ${session.movieTitle} (${session.room}) — ${seatLabels.length} seats`,
    );
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
