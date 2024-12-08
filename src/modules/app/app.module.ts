import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'
import configurations from '../../configuration'
import { ChatModule } from '../chat/chat.module'
import { FriendModule } from '../friend/friend.module'
import { MessageModule } from '../message/message.module'
import { SocketModule } from '../socket/socket.module'
import { UserModule } from '../user/user.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configurations],
        }),
        AuthModule,
        FriendModule,
        UserModule,
        ChatModule,
        MessageModule,
        SocketModule,
        PassportModule.register({
            session: true,
        }),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
