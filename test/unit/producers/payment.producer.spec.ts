import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { PaymentProducer } from '../../../src/modules/messaging/producers/payment.producer';
import { RABBITMQ_CLIENT } from '../../../src/modules/messaging/producers/reservation.producer';

describe('PaymentProducer', () => {
  let producer: PaymentProducer;
  let client: { emit: jest.Mock };

  beforeEach(async () => {
    client = { emit: jest.fn().mockReturnValue(of(undefined)) };

    const module = await Test.createTestingModule({
      providers: [
        PaymentProducer,
        { provide: RABBITMQ_CLIENT, useValue: client },
      ],
    }).compile();

    producer = module.get(PaymentProducer);
  });

  describe('emitPaymentConfirmed', () => {
    it('should emit payment.confirmed event', async () => {
      const payload = {
        saleId: 'sale-1',
        reservationId: 'res-1',
        userId: 'user-1',
        sessionId: 'session-1',
        totalInCents: 5000,
        seatLabels: ['A1', 'A2'],
      };

      await producer.emitPaymentConfirmed(payload);

      expect(client.emit).toHaveBeenCalledWith('payment.confirmed', payload);
    });
  });
});
