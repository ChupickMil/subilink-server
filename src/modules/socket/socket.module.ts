import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { KafkaModule } from '../kafka/kafka.module'
import { MapModule } from '../map/map.module'
import { RedisModule } from '../redis/redis.module'
import { SocketService } from './socket.service'

@Module({
    imports: [
        AuthModule,
        KafkaModule,
        MapModule,
        RedisModule
    ],
    providers: [SocketService],
    exports: [SocketService],
})
export class SocketModule {}
