import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RABBITMQ_QUEUES } from '../messaging.constants';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Injectable()
export class ReservationProducer {
  private readonly logger = new Logger(ReservationProducer.name);

  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) { }

  async emitReservationCreated(payload: {
    reservationId: string;
    userId: string;
    sessionId: string;
    seatIds: string[];
  }) {
    await lastValueFrom(
      this.client.emit(RABBITMQ_QUEUES.RESERVATION_CREATED, payload),
    );
    this.logger.log(
      `Evento ${RABBITMQ_QUEUES.RESERVATION_CREATED} emitido: ${payload.reservationId}`,
    );
  }

  async emitReservationExpired(payload: { reservationIds: string[] }) {
    await lastValueFrom(
      this.client.emit(RABBITMQ_QUEUES.RESERVATION_EXPIRED, payload),
    );
    this.logger.log(
      `Evento ${RABBITMQ_QUEUES.RESERVATION_EXPIRED} emitido: ${payload.reservationIds.length} reserva(s)`,
    );
  }

  async emitReservationCancelled(payload: {
    reservationId: string;
    userId: string;
    sessionId: string;
    seatIds: string[];
  }) {
    await lastValueFrom(
      this.client.emit(RABBITMQ_QUEUES.RESERVATION_CANCELLED, payload),
    );
    this.logger.log(
      `Evento ${RABBITMQ_QUEUES.RESERVATION_CANCELLED} emitido: ${payload.reservationId}`,
    );
  }

  async emitSeatReleased(payload: {
    sessionId: string;
    seatIds: string[];
    reason: 'cancelled' | 'expired';
  }) {
    await lastValueFrom(
      this.client.emit(RABBITMQ_QUEUES.SEAT_RELEASED, payload),
    );
    this.logger.log(
      `Evento ${RABBITMQ_QUEUES.SEAT_RELEASED} emitido: ${payload.seatIds.length} assento(s) liberado(s) [${payload.reason}]`,
    );
  }

  async emitSeatsReleasedBatch(
    events: Array<{
      sessionId: string;
      seatIds: string[];
      reason: 'cancelled' | 'expired';
    }>,
  ) {
    if (events.length === 0) return;

    await lastValueFrom(
      this.client.emit(RABBITMQ_QUEUES.SEAT_RELEASED, { batch: events }),
    );

    const totalSeats = events.reduce((sum, e) => sum + e.seatIds.length, 0);
    this.logger.log(
      `[BATCH] Evento ${RABBITMQ_QUEUES.SEAT_RELEASED} emitido: ${totalSeats} assento(s) em ${events.length} sessão(ões)`,
    );
  }
}

