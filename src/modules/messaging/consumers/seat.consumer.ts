import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { RABBITMQ_QUEUES, REDIS_KEYS } from '../messaging.constants';
import { Retry } from '../../../common/decorators/retry.decorator';

interface SeatReleasedEvent {
  sessionId: string;
  seatIds: string[];
  reason: 'cancelled' | 'expired';
}

interface SeatReleasedPayload {
  sessionId?: string;
  seatIds?: string[];
  reason?: 'cancelled' | 'expired';
  batch?: SeatReleasedEvent[];
}

@Controller()
export class SeatConsumer {
  private readonly logger = new Logger(SeatConsumer.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  @EventPattern(RABBITMQ_QUEUES.SEAT_RELEASED)
  @Retry(3, 200)
  async handleSeatReleased(
    @Payload() data: SeatReleasedPayload,
    @Ctx() context: RmqContext,
  ) {
    void context;

    const events: SeatReleasedEvent[] = data.batch
      ? data.batch
      : [
        {
          sessionId: data.sessionId!,
          seatIds: data.seatIds!,
          reason: data.reason!,
        },
      ];

    const sessionIds = new Set(events.map((e) => e.sessionId));

    if (sessionIds.size > 0) {
      const pipeline = this.redis.pipeline();
      for (const sessionId of sessionIds) {
        pipeline.del(REDIS_KEYS.seatAvailability(sessionId));
      }
      await pipeline.exec();
    }

    const totalSeats = events.reduce((sum, e) => sum + e.seatIds.length, 0);

    if (events.length === 1) {
      this.logger.log(
        `Assento(s) liberado(s) | Sessão: ${events[0].sessionId} | Quantidade: ${totalSeats} | Motivo: ${events[0].reason}`,
      );
    } else {
      this.logger.log(
        `[BATCH] ${totalSeats} assento(s) liberado(s) em ${sessionIds.size} sessão(ões) | ${events.length} evento(s)`,
      );
    }
  }
}
