import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { redisStore } from 'cache-manager-redis-yet'
import { RedisService } from './redis.service'

@Module({
    imports: [
        CacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const host = configService.get('redis_host')
                const port = configService.get('redis_port')
                const pass = configService.get('redis_password')
                
                return {
                    store: redisStore,
                    url: `redis://:${pass}@${host}:${port}`,
                    ttl: configService.get('cache_ttl'),
                    max: configService.get('max_item_in_cache'),
                };
            },
        }),
    ],
    providers: [RedisService, ConfigService],
    exports: [RedisService],
})
export class RedisModule {}
