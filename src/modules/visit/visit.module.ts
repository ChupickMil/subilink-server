import { AuthModule } from '@auth/auth.module'
import { forwardRef, Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { VisitController } from './visit.controller'
import { VisitService } from './visit.service'

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), RedisModule],
  controllers: [VisitController],
  providers: [VisitService, AuthenticatedGuard, TwoFAGuard],
  exports: [VisitService]
})
export class VisitModule {}
