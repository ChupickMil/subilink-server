import { AuthModule } from '@auth/auth.module'
import { forwardRef, Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { FileModule } from '../file/file.module'
import { FriendModule } from '../friend/friend.module'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        FileModule,
        forwardRef(() => AuthModule),
        forwardRef(() => FriendModule),
    ],
    providers: [AuthenticatedGuard, TwoFAGuard, UserService],
    controllers: [UserController],
    exports: [UserService]
})
export class UserModule {}
