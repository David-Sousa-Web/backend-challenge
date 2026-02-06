import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PrismaPaymentRepository } from './repositories/prisma-payment.repository';
import { ReservationModule } from '../reservation/reservation.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [ReservationModule, SessionModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    {
      provide: PaymentRepository,
      useClass: PrismaPaymentRepository,
    },
  ],
})
export class PaymentModule {}
