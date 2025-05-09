import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { FriendModule } from '../friend/friend.module'
import { MapModule } from '../map/map.module'
import { MessageModule } from '../message/message.module'
import { RedisModule } from '../redis/redis.module'
import { UserModule } from '../user/user.module'
import { SocketGateway } from './socket.controller'
import { SocketService } from './socket.service'

@Module({
    imports: [
        AuthModule,
        MapModule,
        RedisModule,
        UserModule,
        FriendModule,
        MessageModule,
        ChatModule,
    ],
    providers: [SocketService, SocketGateway],
    exports: [SocketService],
})
export class SocketModule {}
