import { AuthModule } from '@auth/auth.module'
import { forwardRef, Module } from '@nestjs/common'
import { Transport } from '@nestjs/microservices/enums/transport.enum'
import { ClientsModule } from '@nestjs/microservices/module/clients.module'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { VisitController } from './visit.controller'

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => AuthModule),
        RedisModule,
        ClientsModule.register([
            {
                name: 'VISIT_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                    },
                    consumer: {
                        groupId: 'visit-service',
                        allowAutoTopicCreation: true
                    },
                },
            },
        ]),
    ],
    controllers: [VisitController],
    providers: [AuthenticatedGuard, TwoFAGuard],
    exports: [],
})
export class VisitModule {}
