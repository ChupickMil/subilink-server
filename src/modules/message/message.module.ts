import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { ChatModule } from '../chat/chat.module'
import { KafkaModule } from '../kafka/kafka.module'
import { PrismaModule } from '../prisma/prisma.module'
import { MessageController } from './message.controller'

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        ChatModule,
        KafkaModule
    ],
    providers: [AuthenticatedGuard, TwoFAGuard],
    controllers: [MessageController],
    exports: [],
})
export class MessageModule {}
