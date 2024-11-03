import { Module } from '@nestjs/common';
// import { LocalStrategy } from 'src/common/strategies/local.strategy';
import {
    AuthenticatedGuard,
    LocalAuthGuard,
} from 'src/common/guards/LocalAuthGuard';
import { LocalStrategy } from 'src/common/strategies/local.strategy';
import { SessionSerializer } from 'src/common/utils/SessionSerializer';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
    imports: [UserModule, PrismaModule, RedisModule],
    providers: [
        AuthService,
        { provide: 'AUTH_SERVICE', useClass: AuthService },
        { provide: 'USER_SERVICE', useClass: UserService },
        SessionSerializer,
        LocalStrategy,
        LocalAuthGuard,
        AuthenticatedGuard,
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
