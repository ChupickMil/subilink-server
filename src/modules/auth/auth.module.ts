import { Module } from '@nestjs/common'
// import { LocalStrategy } from 'src/common/strategies/local.strategy';
import { ClientsModule, Transport } from '@nestjs/microservices'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { LocalAuthGuard } from 'src/common/guards/LocalAuthGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { LocalStrategy } from 'src/common/strategies/local.strategy'
import { SessionSerializer } from 'src/common/utils/SessionSerializer'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        ClientsModule.register([
            {
                name: 'USER_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                    },
                    consumer: {
                        groupId: 'auth-service', 
                    },
                },
            },
            {
                name: 'VISIT_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                    },
                    consumer: {
                        groupId: 'visit-service', 
                    },
                },
            },
        ]),
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
    exports: [AuthService, ClientsModule],
})
export class AuthModule {}
