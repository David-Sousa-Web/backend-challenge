import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReservationService } from '../../../src/modules/reservation/services/reservation.service';
import { ReservationRepository } from '../../../src/modules/reservation/repositories/reservation.repository';
import { ReservationProducer } from '../../../src/modules/messaging/producers/reservation.producer';
import { SessionRepository } from '../../../src/modules/session/repositories/session.repository';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';

jest.mock('redlock', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      acquire: jest.fn().mockResolvedValue({ release: jest.fn() }),
    })),
  };
});

describe('ReservationService', () => {
  let service: ReservationService;
  let repo: jest.Mocked<ReservationRepository>;
  let producer: jest.Mocked<ReservationProducer>;
  let sessionRepo: jest.Mocked<SessionRepository>;

  const mockReservation = {
    id: 'res-1',
    userId: 'user-1',
    sessionId: 'session-1',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 30000),
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    reservationSeats: [
      {
        seatId: 'seat-1',
        seat: { id: 'seat-1', label: 'A1', status: 'RESERVED' },
      },
    ],
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: ReservationRepository,
          useValue: {
            createWithLock: jest.fn(),
            findById: jest.fn(),
            findByIdempotencyKey: jest.fn(),
            findByUserId: jest.fn(),
            cancel: jest.fn(),
            expirePendingReservations: jest.fn(),
          },
        },
        {
          provide: ReservationProducer,
          useValue: {
            emitReservationCreated: jest.fn(),
            emitReservationExpired: jest.fn(),
            emitReservationCancelled: jest.fn(),
            emitSeatReleased: jest.fn(),
            emitSeatsReleasedBatch: jest.fn(),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {},
        },
        {
          provide: SessionRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ReservationService);
    repo = module.get(ReservationRepository);
    producer = module.get(ReservationProducer);
    sessionRepo = module.get(SessionRepository);
  });

  describe('create', () => {
    const dto = { sessionId: 'session-1', seatIds: ['seat-1'] };
    const mockSession = { id: 'session-1', movieTitle: 'Test', room: 'A', startsAt: new Date(), ticketPriceInCents: 2500, seats: [] };

    it('should create a reservation and emit event', async () => {
      sessionRepo.findById.mockResolvedValue(mockSession as any);
      repo.createWithLock.mockResolvedValue(mockReservation);

      const result = await service.create('user-1', dto);

      expect(sessionRepo.findById).toHaveBeenCalledWith('session-1');
      expect(repo.createWithLock).toHaveBeenCalled();
      expect(producer.emitReservationCreated).toHaveBeenCalledWith(
        expect.objectContaining({ reservationId: 'res-1' }),
      );
      expect(result).toEqual(mockReservation);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      sessionRepo.findById.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.createWithLock).not.toHaveBeenCalled();
    });

    it('should return existing reservation if idempotencyKey matches', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(mockReservation);

      const result = await service.create('user-1', dto, 'key-123');

      expect(repo.createWithLock).not.toHaveBeenCalled();
      expect(result).toEqual(mockReservation);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending reservation and emit event', async () => {
      repo.findById.mockResolvedValue(mockReservation);
      repo.cancel.mockResolvedValue({
        ...mockReservation,
        status: 'CANCELLED',
      });

      const result = await service.cancel('res-1', 'user-1');

      expect(repo.cancel).toHaveBeenCalledWith('res-1');
      expect(producer.emitReservationCancelled).toHaveBeenCalled();
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException if reservation not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.cancel('none', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own reservation', async () => {
      repo.findById.mockResolvedValue(mockReservation);

      await expect(service.cancel('res-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if reservation is not pending', async () => {
      repo.findById.mockResolvedValue({
        ...mockReservation,
        status: 'CONFIRMED',
      });

      await expect(service.cancel('res-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findById', () => {
    it('should return the reservation', async () => {
      repo.findById.mockResolvedValue(mockReservation);

      const result = await service.findById('res-1');

      expect(result).toEqual(mockReservation);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return user reservations', async () => {
      repo.findByUserId.mockResolvedValue([mockReservation]);

      const result = await service.findByUser('user-1');

      expect(result).toEqual([mockReservation]);
    });
  });

  describe('handleExpiredReservations', () => {
    it('should expire reservations and emit events in batch', async () => {
      repo.expirePendingReservations.mockResolvedValue([
        { reservationId: 'res-1', sessionId: 'sess-1', seatIds: ['seat-1'] },
        { reservationId: 'res-2', sessionId: 'sess-2', seatIds: ['seat-2'] },
      ]);

      await service.handleExpiredReservations();

      expect(producer.emitReservationExpired).toHaveBeenCalledWith({
        reservationIds: ['res-1', 'res-2'],
      });
      expect(producer.emitSeatsReleasedBatch).toHaveBeenCalledWith([
        { sessionId: 'sess-1', seatIds: ['seat-1'], reason: 'expired' },
        { sessionId: 'sess-2', seatIds: ['seat-2'], reason: 'expired' },
      ]);
    });

    it('should not emit if no reservations expired', async () => {
      repo.expirePendingReservations.mockResolvedValue([]);

      await service.handleExpiredReservations();

      expect(producer.emitReservationExpired).not.toHaveBeenCalled();
      expect(producer.emitSeatsReleasedBatch).not.toHaveBeenCalled();
    });
  });
});
