import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env.validation';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis({ host: env.REDIS_HOST, port: env.REDIS_PORT }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
