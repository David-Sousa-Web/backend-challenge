import { appConfig } from './app.config';
import { jwtConfig } from './jwt.config';
import { rabbitmqConfig } from './rabbitmq.config';
import { redisConfig } from './redis.config';

export { env } from './env.validation';
export { validate } from './env.validation';

export const configs = [appConfig, jwtConfig, rabbitmqConfig, redisConfig];
