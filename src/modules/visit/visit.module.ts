import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { KafkaModule } from '../kafka/kafka.module'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { VisitController } from './visit.controller'

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        RedisModule,
        KafkaModule
        // ClientsModule.register([
        //     {
        //         name: 'VISIT_SERVICE',
        //         transport: Transport.KAFKA,
        //         options: {
        //             client: {
        //                 brokers: ['localhost:9092'],
        //             },
        //             consumer: {
        //                 groupId: 'visit-service'
        //             }
        //         },
        //     },
        // ]),
    ],
    controllers: [VisitController],
    providers: [AuthenticatedGuard, TwoFAGuard],
    exports: [],
})
export class VisitModule {}
