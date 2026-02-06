import { Test } from '@nestjs/testing';
import { ReservationConsumer } from '../../../src/modules/messaging/consumers/reservation.consumer';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';

describe('ReservationConsumer', () => {
  let consumer: ReservationConsumer;
  let redis: {
    set: jest.Mock;
    del: jest.Mock;
    pipeline: jest.Mock;
  };

  beforeEach(async () => {
    const pipelineExec = jest.fn().mockResolvedValue([]);
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        del: jest.fn().mockReturnThis(),
        exec: pipelineExec,
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [ReservationConsumer],
      providers: [{ provide: REDIS_CLIENT, useValue: redis }],
    }).compile();

    consumer = module.get(ReservationConsumer);
  });

  describe('handleReservationCreated', () => {
    it('should store reservation tracking in Redis with TTL', async () => {
      const data = {
        reservationId: 'res-1',
        userId: 'user-1',
        sessionId: 'session-1',
        seatIds: ['seat-1'],
      };

      await consumer.handleReservationCreated(data, null as any);

      expect(redis.set).toHaveBeenCalledWith(
        'reservation:tracking:res-1',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
      // Also invalidates seat cache
      expect(redis.del).toHaveBeenCalledWith(
        'session:session-1:available_seats',
      );
    });
  });

  describe('handleReservationExpired', () => {
    it('should remove tracking keys via pipeline', async () => {
      const data = { reservationIds: ['res-1', 'res-2'] };

      await consumer.handleReservationExpired(data, null as any);

      expect(redis.pipeline).toHaveBeenCalled();
    });
  });

  describe('handleReservationCancelled', () => {
    it('should remove tracking and invalidate seat cache', async () => {
      const data = {
        reservationId: 'res-1',
        userId: 'user-1',
        sessionId: 'session-1',
        seatIds: ['seat-1'],
      };

      await consumer.handleReservationCancelled(data, null as any);

      expect(redis.del).toHaveBeenCalledWith('reservation:tracking:res-1');
      expect(redis.del).toHaveBeenCalledWith(
        'session:session-1:available_seats',
      );
    });
  });
});
