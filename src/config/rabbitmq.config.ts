import { registerAs } from '@nestjs/config';
import { env } from './env.validation';

export const rabbitmqConfig = registerAs('rabbitmq', () => ({
  url: env.RABBITMQ_URL,
}));
