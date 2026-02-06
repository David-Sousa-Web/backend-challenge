import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from './prisma/prisma.service';
import { REDIS_CLIENT } from './redis/redis.module';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getHealth() {
    const checks = {
      status: 'ok' as string,
      timestamp: new Date().toISOString(),
      services: {
        database: 'down' as string,
        redis: 'down' as string,
      },
    };

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      checks.services.database = 'up';
    } catch {
      checks.status = 'degraded';
    }

    try {
      await this.redis.ping();
      checks.services.redis = 'up';
    } catch {
      checks.status = 'degraded';
    }

    return checks;
  }
}
