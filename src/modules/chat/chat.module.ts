import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { PrismaModule } from '../prisma/prisma.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
    imports: [PrismaModule, AuthModule],
    providers: [ChatService, AuthenticatedGuard, TwoFAGuard],
    controllers: [ChatController],
})
export class ChatModule {}
