import { Module } from '@nestjs/common'
import { Transport } from '@nestjs/microservices/enums/transport.enum'
import { ClientsModule } from '@nestjs/microservices/module/clients.module'
import { KafkaService } from './kafka.service'

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'USER_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                        logLevel: 4,
                    },
                    consumer: {
                        groupId: 'user-service',
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
            {
                name: 'MESSAGE_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                    },
                    consumer: {
                        groupId: 'message-service',
                    },
                },
            },
            {
                name: 'FRIEND_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                    },
                    consumer: {
                        groupId: 'friend-service',
                    },
                },
            },
            {
                name: 'CHAT_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        brokers: ['localhost:9092'],
                    },
                    consumer: {
                        groupId: 'chat-service',
                    },
                },
            },
        ]),
    ],

    providers: [KafkaService],
    exports: [ClientsModule, KafkaService],
})
export class KafkaModule {}
