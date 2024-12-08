import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { PrismaModule } from '../prisma/prisma.module'
import { MessageController } from './message.controller'
import { MessageService } from './message.service'

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [MessageService, AuthenticatedGuard, TwoFAGuard],
  controllers: [MessageController],
  exports: [MessageService]
})
export class MessageModule {}
