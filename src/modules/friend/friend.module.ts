import { AuthModule } from '@auth/auth.module'
import { forwardRef, Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { UserModule } from '../user/user.module'
import { FriendController } from './friend.controller'
import { FriendService } from './friend.service'

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        forwardRef(() => AuthModule),
        forwardRef(() => UserModule),
    ],
    providers: [FriendService],
    controllers: [FriendController],
    exports: [FriendService],
})
export class FriendModule {}
