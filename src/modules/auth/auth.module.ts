import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { env } from '../../config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const signOptions: JwtSignOptions = {
  expiresIn: env.JWT_EXPIRES_IN,
} as JwtSignOptions;

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: env.JWT_SECRET,
      signOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AuthRepository,
      useClass: PrismaAuthRepository,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
