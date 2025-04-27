import { AuthModule } from '@auth/auth.module'
import { forwardRef, Module } from '@nestjs/common'
import { MessageModule } from '../message/message.module'
import { PrismaModule } from '../prisma/prisma.module'
import { UserModule } from '../user/user.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        UserModule, 
        forwardRef(() => MessageModule)
    ],
    providers: [ChatService],
    controllers: [ChatController],
    exports: [ChatService],
})
export class ChatModule {}
