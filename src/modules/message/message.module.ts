import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { ChatModule } from '../chat/chat.module'
import { PrismaModule } from '../prisma/prisma.module'
import { MessageController } from './message.controller'
import { MessageService } from './message.service'

@Module({
  imports: [PrismaModule, AuthModule, ChatModule],
  providers: [MessageService, AuthenticatedGuard, TwoFAGuard],
  controllers: [MessageController],
  exports: [MessageService]
})
export class MessageModule {}
