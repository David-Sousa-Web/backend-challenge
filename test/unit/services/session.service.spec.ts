import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SessionService } from '../../../src/modules/session/services/session.service';
import { SessionRepository } from '../../../src/modules/session/repositories/session.repository';

describe('SessionService', () => {
  let service: SessionService;
  let repo: jest.Mocked<SessionRepository>;

  const mockSession = {
    id: 'session-1',
    movieTitle: 'Avengers',
    room: 'Room 1',
    startsAt: new Date(),
    ticketPriceInCents: 2500,
    createdAt: new Date(),
    updatedAt: new Date(),
    seats: [
      {
        id: 'seat-1',
        sessionId: 'session-1',
        label: 'A1',
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: SessionRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findSeatsBySessionId: jest.fn(),
            findAvailableSeatsBySessionId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SessionService);
    repo = module.get(SessionRepository);
  });

  describe('create', () => {
    it('should create a session with seats', async () => {
      const dto = {
        movieTitle: 'Avengers',
        room: 'Room 1',
        startsAt: '2026-02-10T19:00:00.000Z',
        ticketPriceInCents: 2500,
        seats: Array.from({ length: 16 }, (_, i) => `A${i + 1}`),
      };

      repo.create.mockResolvedValue(mockSession);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movieTitle: dto.movieTitle,
          room: dto.room,
          ticketPriceInCents: dto.ticketPriceInCents,
          seatLabels: dto.seats,
        }),
      );
      expect(result).toEqual(mockSession);
    });
  });

  describe('findAll', () => {
    it('should return all sessions', async () => {
      repo.findAll.mockResolvedValue([mockSession]);

      const result = await service.findAll();

      expect(result).toEqual([mockSession]);
    });
  });

  describe('findById', () => {
    it('should return the session', async () => {
      repo.findById.mockResolvedValue(mockSession);

      const result = await service.findById('session-1');

      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSeats', () => {
    it('should return seats for a session', async () => {
      repo.findById.mockResolvedValue(mockSession);
      repo.findSeatsBySessionId.mockResolvedValue(mockSession.seats);

      const result = await service.findSeats('session-1');

      expect(result).toEqual(mockSession.seats);
    });

    it('should throw NotFoundException if session not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findSeats('none')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAvailableSeats', () => {
    it('should return available seats', async () => {
      repo.findById.mockResolvedValue(mockSession);
      repo.findAvailableSeatsBySessionId.mockResolvedValue(mockSession.seats);

      const result = await service.findAvailableSeats('session-1');

      expect(result).toEqual(mockSession.seats);
    });

    it('should throw NotFoundException if session not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findAvailableSeats('none')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
