import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Transport } from '@nestjs/microservices/enums/transport.enum'
import { ClientsModule } from '@nestjs/microservices/module/clients.module'
import { KafkaService } from './kafka.service'

@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'USER_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => {
                    const broker = configService.get<string>('kafka_broker');
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                brokers: broker ? [broker] : ['localhost:9092'],
                            },
                            consumer: {
                                groupId: 'user-service',
                            },
                        },
                    };
                },
            },
            {
                name: 'VISIT_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => {
                    const broker = configService.get<string>('kafka_broker');
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                brokers: broker ? [broker] : ['localhost:9092'],
                            },
                            consumer: {
                                groupId: 'visit-service',
                            },
                        },
                    };
                },
            },
            {
                name: 'MESSAGE_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => {
                    const broker = configService.get<string>('kafka_broker');
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                brokers: broker ? [broker] : ['localhost:9092'],
                            },
                            consumer: {
                                groupId: 'message-service',
                            },
                        },
                    };
                },
            },
            {
                name: 'FRIEND_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => {
                    const broker = configService.get<string>('kafka_broker');
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                brokers: broker ? [broker] : ['localhost:9092'],
                            },
                            consumer: {
                                groupId: 'friend-service',
                            },
                        },
                    };
                },
            },
            {
                name: 'CHAT_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => {
                    const broker = configService.get<string>('kafka_broker');
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                brokers: broker ? [broker] : ['localhost:9092'],
                            },
                            consumer: {
                                groupId: 'chat-service',
                            },
                        },
                    };
                },
            },
            {
                name: 'FILES_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => {
                    const broker = configService.get<string>('kafka_broker');
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                brokers: broker ? [broker] : ['localhost:9092'],
                            },
                            consumer: {
                                groupId: 'files-service',
                            },
                        },
                    };
                },
            },
        ]),
    ],
    providers: [KafkaService],
    exports: [ClientsModule, KafkaService],
})
export class KafkaModule {}
