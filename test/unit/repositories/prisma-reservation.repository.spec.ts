import { Test } from '@nestjs/testing';
import { PrismaReservationRepository } from '../../../src/modules/reservation/repositories/prisma-reservation.repository';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('PrismaReservationRepository', () => {
  let repository: PrismaReservationRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      reservation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      reservationSeat: {
        findMany: jest.fn(),
      },
      seat: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PrismaReservationRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(PrismaReservationRepository);
  });

  describe('findById', () => {
    it('should find reservation with seats', async () => {
      const mockRes = { id: 'res-1', reservationSeats: [] };
      prisma.reservation.findUnique.mockResolvedValue(mockRes);

      const result = await repository.findById('res-1');

      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        include: { reservationSeats: { include: { seat: true } } },
      });
      expect(result).toEqual(mockRes);
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should find reservation by idempotency key', async () => {
      const mockRes = { id: 'res-1' };
      prisma.reservation.findUnique.mockResolvedValue(mockRes);

      const result = await repository.findByIdempotencyKey('key-1');

      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: 'key-1' },
        include: { reservationSeats: { include: { seat: true } } },
      });
      expect(result).toEqual(mockRes);
    });
  });

  describe('findByUserId', () => {
    it('should return reservations for user', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);

      const result = await repository.findByUserId('user-1');

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('cancel', () => {
    it('should cancel reservation and release seats in transaction', async () => {
      const mockCancelled = { id: 'res-1', status: 'CANCELLED' };

      prisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          reservationSeat: {
            findMany: jest.fn().mockResolvedValue([{ seatId: 'seat-1' }]),
          },
          seat: { updateMany: jest.fn() },
          reservation: { update: jest.fn().mockResolvedValue(mockCancelled) },
        };
        return cb(tx);
      });

      const result = await repository.cancel('res-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockCancelled);
    });
  });

  describe('expirePendingReservations', () => {
    it('should expire pending reservations and release seats', async () => {
      prisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          reservation: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'res-1',
                sessionId: 'session-1',
                reservationSeats: [{ seatId: 'seat-1' }],
              },
            ]),
            updateMany: jest.fn(),
          },
          seat: { updateMany: jest.fn() },
        };
        return cb(tx);
      });

      const result = await repository.expirePendingReservations();

      expect(result).toEqual([
        {
          reservationId: 'res-1',
          sessionId: 'session-1',
          seatIds: ['seat-1'],
        },
      ]);
    });

    it('should return empty array if no expired reservations', async () => {
      prisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          reservation: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        };
        return cb(tx);
      });

      const result = await repository.expirePendingReservations();

      expect(result).toEqual([]);
    });
  });
});
