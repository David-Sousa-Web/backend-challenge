import { Controller, Inject, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { env } from '../../../config/env.validation';
import { RABBITMQ_QUEUES, REDIS_KEYS } from '../messaging.constants';

@Controller()
export class ReservationConsumer {
  private readonly logger = new Logger(ReservationConsumer.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @EventPattern(RABBITMQ_QUEUES.RESERVATION_CREATED)
  async handleReservationCreated(
    @Payload()
    data: {
      reservationId: string;
      userId: string;
      sessionId: string;
      seatIds: string[];
    },
  ) {
    await this.redis.set(
      REDIS_KEYS.reservationTracking(data.reservationId),
      JSON.stringify({
        userId: data.userId,
        sessionId: data.sessionId,
        seatIds: data.seatIds,
        createdAt: new Date().toISOString(),
      }),
      'EX',
      env.RESERVATION_TTL_SECONDS,
    );

    await this.invalidateSeatCache(data.sessionId);

    this.logger.log(
      `Reserva ${data.reservationId} rastreada no Redis (TTL: ${env.RESERVATION_TTL_SECONDS}s) | Sessão: ${data.sessionId}`,
    );
  }

  @EventPattern(RABBITMQ_QUEUES.RESERVATION_EXPIRED)
  async handleReservationExpired(
    @Payload() data: { reservationIds: string[] },
  ) {
    const pipeline = this.redis.pipeline();

    for (const id of data.reservationIds) {
      pipeline.del(REDIS_KEYS.reservationTracking(id));
    }

    await pipeline.exec();

    this.logger.log(
      `${data.reservationIds.length} reserva(s) expirada(s): tracking removido do Redis`,
    );
  }

  @EventPattern(RABBITMQ_QUEUES.RESERVATION_CANCELLED)
  async handleReservationCancelled(
    @Payload()
    data: {
      reservationId: string;
      userId: string;
      sessionId: string;
      seatIds: string[];
    },
  ) {
    await this.redis.del(REDIS_KEYS.reservationTracking(data.reservationId));
    await this.invalidateSeatCache(data.sessionId);

    this.logger.log(
      `Reserva ${data.reservationId} cancelada: tracking removido, cache invalidado`,
    );
  }

  private async invalidateSeatCache(sessionId: string) {
    await this.redis.del(REDIS_KEYS.seatAvailability(sessionId));
  }
}
