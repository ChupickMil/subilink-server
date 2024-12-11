import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { PrismaModule } from '../prisma/prisma.module'
import { UserModule } from '../user/user.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

@Module({
    imports: [PrismaModule, AuthModule, UserModule],
    providers: [ChatService, AuthenticatedGuard, TwoFAGuard],
    controllers: [ChatController],
    exports: [ChatService]
})
export class ChatModule {}
