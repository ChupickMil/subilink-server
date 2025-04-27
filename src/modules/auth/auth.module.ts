import { forwardRef, Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { LocalAuthGuard } from 'src/common/guards/LocalAuthGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { LocalStrategy } from 'src/common/strategies/local.strategy'
import { SessionSerializer } from 'src/common/utils/SessionSerializer'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { UserModule } from '../user/user.module'
import { VisitModule } from '../visit/visit.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
    imports: [
        PrismaModule,
        RedisModule,    
        VisitModule,
        forwardRef(() => VisitModule),
        forwardRef(() => UserModule),
    ],
    providers: [
        AuthService,
        { provide: 'AUTH_SERVICE', useClass: AuthService },
        SessionSerializer,
        LocalStrategy,
        LocalAuthGuard,
        AuthenticatedGuard,
        TwoFAGuard,
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
