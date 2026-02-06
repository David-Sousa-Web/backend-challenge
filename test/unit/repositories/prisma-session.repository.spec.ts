import { Test } from '@nestjs/testing';
import { PrismaSessionRepository } from '../../../src/modules/session/repositories/prisma-session.repository';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('PrismaSessionRepository', () => {
  let repository: PrismaSessionRepository;
  let prisma: {
    session: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    seat: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      seat: {
        findMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        PrismaSessionRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(PrismaSessionRepository);
  });

  describe('create', () => {
    it('should create session with seats', async () => {
      const data = {
        movieTitle: 'Film',
        room: 'Room 1',
        startsAt: new Date(),
        ticketPriceInCents: 2500,
        seatLabels: ['A1', 'A2'],
      };
      const mockSession = { id: 'session-1', ...data, seats: [] };
      prisma.session.create.mockResolvedValue(mockSession);

      const result = await repository.create(data);

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          movieTitle: data.movieTitle,
          room: data.room,
          startsAt: data.startsAt,
          ticketPriceInCents: data.ticketPriceInCents,
          seats: {
            createMany: {
              data: [{ label: 'A1' }, { label: 'A2' }],
            },
          },
        },
        include: { seats: true },
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('findById', () => {
    it('should find session with seats', async () => {
      const mockSession = { id: 'session-1', seats: [] };
      prisma.session.findUnique.mockResolvedValue(mockSession);

      const result = await repository.findById('session-1');

      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: { seats: true },
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('findAll', () => {
    it('should return sessions ordered by startsAt', async () => {
      prisma.session.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        orderBy: { startsAt: 'asc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findSeatsBySessionId', () => {
    it('should return seats ordered by label', async () => {
      prisma.seat.findMany.mockResolvedValue([]);

      const result = await repository.findSeatsBySessionId('session-1');

      expect(prisma.seat.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        orderBy: { label: 'asc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findAvailableSeatsBySessionId', () => {
    it('should return only available seats', async () => {
      prisma.seat.findMany.mockResolvedValue([]);

      const result =
        await repository.findAvailableSeatsBySessionId('session-1');

      expect(prisma.seat.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1', status: 'AVAILABLE' },
        orderBy: { label: 'asc' },
      });
      expect(result).toEqual([]);
    });
  });
});
