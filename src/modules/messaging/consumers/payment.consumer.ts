import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { RABBITMQ_QUEUES, REDIS_KEYS } from '../messaging.constants';
import { Retry } from '../../../common/decorators/retry.decorator';

@Controller()
export class PaymentConsumer {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @EventPattern(RABBITMQ_QUEUES.PAYMENT_CONFIRMED)
  @Retry(3, 200)
  async handlePaymentConfirmed(
    @Payload()
    data: {
      saleId: string;
      reservationId: string;
      userId: string;
      sessionId: string;
      totalInCents: number;
      seatLabels: string[];
    },
    @Ctx() context: RmqContext,
  ) {
    void context;
    await this.redis.del(REDIS_KEYS.reservationTracking(data.reservationId));

    await this.redis.set(
      REDIS_KEYS.ticket(data.saleId),
      JSON.stringify({
        saleId: data.saleId,
        reservationId: data.reservationId,
        userId: data.userId,
        sessionId: data.sessionId,
        seatLabels: data.seatLabels,
        totalInCents: data.totalInCents,
        confirmedAt: new Date().toISOString(),
      }),
    );

    await this.redis.del(REDIS_KEYS.seatAvailability(data.sessionId));

    this.logger.log(
      `Ingresso digital gerado: ticket:${data.saleId} | Assentos: ${data.seatLabels.join(', ')} | Total: R$ ${(data.totalInCents / 100).toFixed(2)}`,
    );
  }
}
