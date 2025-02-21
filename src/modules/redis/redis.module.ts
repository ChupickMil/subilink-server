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
            useFactory: async (configService: ConfigService) => ({
                store: redisStore,
                host: configService.get('redis_host'),
                port: configService.get('redis_port'),
                ttl: configService.get('cache_ttl'),
                max: configService.get('max_item-in-cache'),
            }),
        }),
        // ClientsModule.register([
        //     {
        //         name: 'REDIS_SERVICE',
        //         transport: Transport.KAFKA,
        //         options: {
        //             client: {
        //                 clientId: 'redis',
        //                 brokers: ['localhost:9092'],
        //             },
        //             consumer: {
        //                 groupId: 'redis-service',
        //                 allowAutoTopicCreation: true
        //             },
        //         },
        //     },
        // ]),
    ],
    providers: [RedisService, ConfigService],
    exports: [RedisService],
})
export class RedisModule {}
