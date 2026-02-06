import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RABBITMQ_QUEUES } from '../messaging.constants';
import { RABBITMQ_CLIENT } from './reservation.producer';

@Injectable()
export class PaymentProducer {
  private readonly logger = new Logger(PaymentProducer.name);

  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  async emitPaymentConfirmed(payload: {
    saleId: string;
    reservationId: string;
    userId: string;
    sessionId: string;
    totalInCents: number;
    seatLabels: string[];
  }) {
    await lastValueFrom(
      this.client.emit(RABBITMQ_QUEUES.PAYMENT_CONFIRMED, payload),
    );
    this.logger.log(
      `Evento ${RABBITMQ_QUEUES.PAYMENT_CONFIRMED} emitido: ${payload.saleId}`,
    );
  }
}
