import { AuthModule } from '@auth/auth.module'
import { forwardRef, Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { FileModule } from '../file/file.module'
import { PrismaModule } from '../prisma/prisma.module'
import { UserModule } from '../user/user.module'
import { MessageController } from './message.controller'
import { MessageService } from './message.service'

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        UserModule,
        FileModule,
        forwardRef(() => ChatModule),
    ],
    providers: [
        MessageService,
    ],
    controllers: [MessageController],
    exports: [MessageService],
})
export class MessageModule {}
