import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'
// import { TrackVisitMiddleware } from 'src/middlewares/TrackVisitMiddleware'
import configurations from '../../configuration'
import { ChatModule } from '../chat/chat.module'
import { FriendModule } from '../friend/friend.module'
import { MessageModule } from '../message/message.module'
import { SocketModule } from '../socket/socket.module'
import { UserModule } from '../user/user.module'
import { VisitModule } from '../visit/visit.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configurations],
        }),
        AuthModule,
        FriendModule,
        VisitModule,
        UserModule,
        ChatModule,
        MessageModule,
        SocketModule,
        PassportModule.register({
            session: true,
        }),
    ],
})

export class AppModule {}

// подключение нашего middleware
// implements NestModule {
//     //     configure(consumer: MiddlewareConsumer) {
//     //         consumer.apply(TrackVisitMiddleware).forRoutes('*'); // Применяем ко всем маршрутам
//     //     }
//     // }
