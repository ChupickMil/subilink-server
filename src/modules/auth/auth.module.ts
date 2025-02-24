import { Module } from '@nestjs/common'
// import { LocalStrategy } from 'src/common/strategies/local.strategy';
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { LocalAuthGuard } from 'src/common/guards/LocalAuthGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { LocalStrategy } from 'src/common/strategies/local.strategy'
import { SessionSerializer } from 'src/common/utils/SessionSerializer'
import { KafkaModule } from '../kafka/kafka.module'
import { KafkaService } from '../kafka/kafka.service'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
    imports: [
        KafkaModule,
        PrismaModule,
        RedisModule,
    ],
    providers: [
        AuthService,
        { provide: 'AUTH_SERVICE', useClass: AuthService },
        SessionSerializer,
        LocalStrategy,
        LocalAuthGuard,
        AuthenticatedGuard,
        TwoFAGuard,
        KafkaService
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
