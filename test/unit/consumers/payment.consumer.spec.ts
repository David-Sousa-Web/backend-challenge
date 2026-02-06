import { Test } from '@nestjs/testing';
import { PaymentConsumer } from '../../../src/modules/messaging/consumers/payment.consumer';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';

describe('PaymentConsumer', () => {
  let consumer: PaymentConsumer;
  let redis: {
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module = await Test.createTestingModule({
      controllers: [PaymentConsumer],
      providers: [{ provide: REDIS_CLIENT, useValue: redis }],
    }).compile();

    consumer = module.get(PaymentConsumer);
  });

  describe('handlePaymentConfirmed', () => {
    it('should remove reservation tracking and store digital ticket', async () => {
      const data = {
        saleId: 'sale-1',
        reservationId: 'res-1',
        userId: 'user-1',
        sessionId: 'session-1',
        totalInCents: 5000,
        seatLabels: ['A1', 'A2'],
      };

      await consumer.handlePaymentConfirmed(data, null as any);

      // Removes reservation tracking
      expect(redis.del).toHaveBeenCalledWith('reservation:tracking:res-1');

      // Stores digital ticket
      expect(redis.set).toHaveBeenCalledWith(
        'ticket:sale-1',
        expect.any(String),
      );

      // Invalidates seat cache
      expect(redis.del).toHaveBeenCalledWith(
        'session:session-1:available_seats',
      );
    });
  });
});
