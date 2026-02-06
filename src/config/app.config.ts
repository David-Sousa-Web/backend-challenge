import { registerAs } from '@nestjs/config';
import { env } from './env.validation';

export const appConfig = registerAs('app', () => ({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  reservationTtlSeconds: env.RESERVATION_TTL_SECONDS,
}));
