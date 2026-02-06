import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RABBITMQ_QUEUES } from '../messaging.constants';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Injectable()
export class ReservationProducer {
  private readonly logger = new Logger(ReservationProducer.name);

  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

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
}
