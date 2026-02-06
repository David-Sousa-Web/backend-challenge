import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { configs, validate, env } from './config';
import { Environment } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { SessionModule } from './modules/session/session.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { PaymentModule } from './modules/payment/payment.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      validate,
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          env.NODE_ENV !== Environment.Production
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: env.NODE_ENV === Environment.Production ? 'info' : 'debug',
      },
    }),

    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),

    ScheduleModule.forRoot(),

    PrismaModule,

    SessionModule,
    ReservationModule,
    PaymentModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
