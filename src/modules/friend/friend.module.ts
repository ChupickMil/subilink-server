import { AuthModule } from '@auth/auth.module'
import { AuthService } from '@auth/auth.service'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { FriendController } from './friend.controller'
import { FriendService } from './friend.service'

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        AuthModule,
    ],
    providers: [
        FriendService,
        AuthService,
        AuthenticatedGuard,
        TwoFAGuard,
    ],
    controllers: [FriendController],
    exports: [FriendService],
})
export class FriendModule {}
