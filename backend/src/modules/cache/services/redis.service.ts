import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      retryStrategy: (times: number) => {
        return Math.min(times * 50, 2000);
      },
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);
  }

  async onModuleInit() {
    this.client.on('error', err => {
      console.error('Redis Client Error:', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    key: string,
    ttl: number = 30000,
    retries: number = 3,
    retryDelay: number = 100
  ): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const lockValue = Date.now().toString();

    for (let i = 0; i < retries; i++) {
      const result = await this.client.set(lockKey, lockValue, 'PX', ttl, 'NX');

      if (result === 'OK') {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    return false;
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.client.del(lockKey);
  }

  /**
   * Execute a function with distributed lock
   */
  async withLock<T>(key: string, fn: () => Promise<T>, ttl: number = 30000): Promise<T | null> {
    const acquired = await this.acquireLock(key, ttl);

    if (!acquired) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }
}
