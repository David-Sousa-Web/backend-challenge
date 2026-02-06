import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import {
  ReservationProducer,
  RABBITMQ_CLIENT,
} from '../../../src/modules/messaging/producers/reservation.producer';

describe('ReservationProducer', () => {
  let producer: ReservationProducer;
  let client: { emit: jest.Mock };

  beforeEach(async () => {
    client = { emit: jest.fn().mockReturnValue(of(undefined)) };

    const module = await Test.createTestingModule({
      providers: [
        ReservationProducer,
        { provide: RABBITMQ_CLIENT, useValue: client },
      ],
    }).compile();

    producer = module.get(ReservationProducer);
  });

  describe('emitReservationCreated', () => {
    it('should emit reservation.created event', async () => {
      const payload = {
        reservationId: 'res-1',
        userId: 'user-1',
        sessionId: 'session-1',
        seatIds: ['seat-1'],
      };

      await producer.emitReservationCreated(payload);

      expect(client.emit).toHaveBeenCalledWith('reservation.created', payload);
    });
  });

  describe('emitReservationExpired', () => {
    it('should emit reservation.expired event', async () => {
      const payload = { reservationIds: ['res-1', 'res-2'] };

      await producer.emitReservationExpired(payload);

      expect(client.emit).toHaveBeenCalledWith('reservation.expired', payload);
    });
  });

  describe('emitReservationCancelled', () => {
    it('should emit reservation.cancelled event', async () => {
      const payload = {
        reservationId: 'res-1',
        userId: 'user-1',
        sessionId: 'session-1',
        seatIds: ['seat-1'],
      };

      await producer.emitReservationCancelled(payload);

      expect(client.emit).toHaveBeenCalledWith(
        'reservation.cancelled',
        payload,
      );
    });
  });
});
