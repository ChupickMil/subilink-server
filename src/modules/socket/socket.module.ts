import { AuthModule } from '@auth/auth.module'
import { Module } from '@nestjs/common'
import { KafkaModule } from '../kafka/kafka.module'
import { SocketService } from './socket.service'

@Module({
    imports: [
        AuthModule,
        KafkaModule
    ],
    providers: [SocketService],
    exports: [SocketService],
})
export class SocketModule {}
