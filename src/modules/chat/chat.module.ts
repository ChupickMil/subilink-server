import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { KafkaModule } from '../kafka/kafka.module'
import { PrismaModule } from '../prisma/prisma.module'
import { ChatController } from './chat.controller'

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        KafkaModule
    ],
    providers: [AuthenticatedGuard, TwoFAGuard],
    controllers: [ChatController],
    exports: [],
})
export class ChatModule {}
