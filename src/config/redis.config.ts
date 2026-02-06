import { registerAs } from '@nestjs/config';
import { env } from './env.validation';

export const redisConfig = registerAs('redis', () => ({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
}));
