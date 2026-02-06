import { Module } from '@nestjs/common';
import { SessionController } from './controllers/session.controller';
import { SessionService } from './services/session.service';
import { SessionRepository } from './repositories/session.repository';
import { PrismaSessionRepository } from './repositories/prisma-session.repository';

@Module({
  controllers: [SessionController],
  providers: [
    SessionService,
    {
      provide: SessionRepository,
      useClass: PrismaSessionRepository,
    },
  ],
  exports: [SessionRepository],
})
export class SessionModule {}
