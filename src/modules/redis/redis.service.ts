import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, RedisClientType } from 'redis'

@Injectable()
export class RedisService {
    private client: RedisClientType;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
    ) {
        this.client = createClient({
            url: `redis://127.0.0.1:${this.configService.get('redis_port') || 6379}`,
        });
        this.client.connect().catch(console.error);
    }

    getClient(): RedisClientType {
        return this.client;
    }

    async set(key: string, value: any, ttl: number): Promise<void> {
        try {
            await this.cacheManager.set(key, value, ttl);
        } catch (err) {
            console.log(err);
        }
    }

    async get<T>(key: string): Promise<T | undefined> {
        const value = await this.cacheManager.get<T>(key);
        return value;
    }

    async del(key: string): Promise<void> {
        await this.cacheManager.del(key);
    }

    async reset(): Promise<void> {
        await this.cacheManager.reset();
    }
}
