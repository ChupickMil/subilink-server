import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { KafkaModule } from '../kafka/kafka.module'
import { PrismaModule } from '../prisma/prisma.module'
import { UserController } from './user.controller'

@Module({
    imports: [
        AuthModule,
        PrismaModule,
        KafkaModule
    ],
    providers: [AuthenticatedGuard, TwoFAGuard],
    controllers: [UserController],
})
export class UserModule {}
