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
            socket: {
                keepAlive: 10000,
                connectTimeout: 5000
            }
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

    async setGeo(
        userId: number,
        lngLat: [number, number],
    ): Promise<void> {
        try {
            await this.client.geoAdd("user:locations", {
                longitude: lngLat[0],
                latitude: lngLat[1],
                member: `user:${userId}`,
            });
        } catch (err) {
            console.error('Redis GEOADD error:', err);
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

    async isSessionValid(sessionId: string): Promise<boolean> {
        const session = await this.client.get(sessionId);
        return session !== null;
    }

    async getSession(sessionId: string): Promise<null | {
        cookie: {
            originalMaxAge: number
            expires: string
            secure: boolean
            httpOnly: boolean
            path: string
        },
        passport: {
            user: number
        }
    }> {
        const res = await this.client.get(sessionId);

        if(!res) return null 

        return JSON.parse(res)
    }
}
