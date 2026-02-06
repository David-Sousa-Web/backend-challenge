import { Module } from '@nestjs/common';
import { ReservationController } from './controllers/reservation.controller';
import { ReservationService } from './services/reservation.service';
import { ReservationRepository } from './repositories/reservation.repository';
import { PrismaReservationRepository } from './repositories/prisma-reservation.repository';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  controllers: [ReservationController],
  providers: [
    ReservationService,
    {
      provide: ReservationRepository,
      useClass: PrismaReservationRepository,
    },
  ],
  exports: [ReservationRepository],
})
export class ReservationModule { }

