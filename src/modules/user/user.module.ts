import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { Transport } from '@nestjs/microservices/enums/transport.enum'
import { ClientsModule } from '@nestjs/microservices/module/clients.module'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { PrismaModule } from '../prisma/prisma.module'
import { UserController } from './user.controller'

@Module({
    imports: [
        AuthModule,
        PrismaModule,
        ClientsModule.register([
            {
                name: 'USER_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                    },
                    consumer: {
                        groupId: 'user-service',
                        allowAutoTopicCreation: true,
                    },
                },
            },
        ]),
    ],
    providers: [AuthenticatedGuard, TwoFAGuard],
    controllers: [UserController],
})
export class UserModule {}
