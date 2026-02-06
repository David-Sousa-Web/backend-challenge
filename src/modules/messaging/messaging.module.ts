import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { env } from '../../config/env.validation';
import { RABBITMQ_CLIENT } from './producers/reservation.producer';
import { ReservationProducer } from './producers/reservation.producer';
import { PaymentProducer } from './producers/payment.producer';
import { ReservationConsumer } from './consumers/reservation.consumer';
import { PaymentConsumer } from './consumers/payment.consumer';
import { DlqConsumer } from './consumers/dlq.consumer';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: RABBITMQ_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [env.RABBITMQ_URL],
          queue: 'cinema_events',
          queueOptions: {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': 'cinema_events.dlq',
            },
          },
        },
      },
    ]),
  ],
  controllers: [ReservationConsumer, PaymentConsumer, DlqConsumer],
  providers: [ReservationProducer, PaymentProducer],
  exports: [ReservationProducer, PaymentProducer],
})
export class MessagingModule {}
