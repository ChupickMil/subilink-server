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
        const host = this.configService.get('redis_host');
        const port = this.configService.get('redis_port') || 6379;
        const password = this.configService.get('redis_password');

        this.client = createClient({
            url: `redis://:${password}@${host}:${port}`,
        });
        this.client.connect().catch(console.error);
    }

    async getClient(): Promise<RedisClientType> {
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
