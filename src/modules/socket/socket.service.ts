import { Injectable } from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices/client/client-kafka'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets'
import { firstValueFrom } from 'rxjs'
import { KafkaService } from '../kafka/kafka.service'
import { IChatMessageDto, IFriendsRequestDto } from './types'

@Injectable()
@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3000', // точный домен
        // origin: 'http://192.168.31.168:3000', // точный домен
        // origin: 'http://192.168.31.179:3000', // точный домен
    },
})
export class SocketService implements OnGatewayConnection, OnGatewayDisconnect {
    private friendClient: ClientKafka;
    private chatClient: ClientKafka;
    private messageClient: ClientKafka;

    constructor(private readonly kafkaService: KafkaService) {
        this.friendClient = this.kafkaService.getFriendClient();
        this.chatClient = this.kafkaService.getChatClient();
        this.messageClient = this.kafkaService.getMessageClient();
    }

    private activeSockets = new Map<string, any>(); // Хранилище сокетов (userId -> сокет)

    handleConnection(client: any) {
        // Пример: получаем userId из query параметров соединения
        const userId = client.handshake.query.userId;
        if (userId) {
            this.activeSockets.set(userId, client); // Сохраняем сокет

            console.log(`User connected: ${userId}`);
        }
    }

    handleDisconnect(client: any) {
        // Находим и удаляем сокет из хранилища
        const userId = [...this.activeSockets.entries()].find(
            ([_, socket]) => socket === client,
        )?.[0];
        if (userId) {
            this.activeSockets.delete(userId);
            console.log(`User disconnected: ${userId}`);
        }
    }

    @SubscribeMessage('messages')
    async handleEvent(
        @MessageBody() dto: IChatMessageDto,
        @ConnectedSocket() client: any,
    ) {
        const { userId, recipientId, content, fileUuids } = dto;

        // Проверяем существование чата или создаем новый
        const isHasChat = JSON.parse(await firstValueFrom(
            this.chatClient.send('get.is.has.chat', {
                userId,
                recipientId,
            }),
        ));

        const isDeletedChat = JSON.parse(await firstValueFrom(
            this.chatClient.send('get.is.deleted.chat', {
                userId,
                recipientId,
            }),
        ));

        if (isDeletedChat) {
            await firstValueFrom(
                this.chatClient.send('recovery.chat', { userId, recipientId }),
            );
        }

        if (!isHasChat) {
            console.log(123)
            const isCreated = await firstValueFrom(
                this.chatClient.send('create.chat', { userId, recipientId }),
            );
            if (!isCreated) throw new Error('Failed to create chat');
        }

        // Получаем ID чата
        const chatId = String(
            await firstValueFrom(
                this.chatClient.send('get.chat.id', {
                    userId,
                    recipientId,
                }),
            ),
        );

        console.log('chatid')
        console.log(chatId)

        if (!chatId) throw new Error('Chat not found');

        // Отправляем сообщение
        const result = await firstValueFrom(
            this.messageClient.send('send.new.message', {
                userId,
                chatId,
                content,
                fileUuids,
            }),
        );
        // const result = await this.messageService.sendNewMessageChat(
        //     userId,
        //     chatId,
        //     content,
        //     fileUuids,
        // );

        // Уведомляем отправителя
        client.emit('messages', { ...result, userId, recipientId });

        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(recipientId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('messages-notification', {
                ...result,
                userId,
                recipientId,
            });
        } else {
            console.log(`Friend ${recipientId} is not connected`);
        }
    }

    @SubscribeMessage('friends-request')
    async handleFriendsRequests(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.friendId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('friends-request-notification', {
                message: `Новый запрос в друзья от пользователя ${dto.userId}`,
                requesterId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.friendId} is not connected`);
        }

        // записываем в бд
        await firstValueFrom(
            this.friendClient.send('add.friend', {
                userId: dto.userId,
                friendId: dto.friendId,
            }),
        );
        // Подтверждаем действие инициатору
        client.emit('friends-request', { success: true });
    }

    @SubscribeMessage('friends-accept-requests')
    async handleFriendsAcceptRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.friendId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('friends-request-notification', {
                message: `Ваш запрос принял ${dto.userId}`,
                requesterId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.friendId} is not connected`);
        }

        // обновляем бд
        await firstValueFrom(
            this.friendClient.send('accept.request', {
                userId: dto.userId,
                friendId: dto.friendId,
            }),
        );

        // Подтверждаем действие инициатору
        client.emit('friends-accept-request', { success: true });
    }

    @SubscribeMessage('friends-cancel-outgoing-request')
    async handleFriendsCancelRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // обновляем бд
        await firstValueFrom(
            this.friendClient.send('cancel.outgoing.request', {
                userId: dto.userId,
                friendId: dto.friendId,
            }),
        );

        // Подтверждаем действие инициатору
        client.emit('friends-cancel-outgoing-request', { success: true });
    }

    @SubscribeMessage('online-users')
    async handleOnlineUser(
        @MessageBody() dto: number[],
        @ConnectedSocket() client: any,
    ) {
        const onlineUser = Array();

        dto.forEach((id) => {
            const userSocket = this.activeSockets.get(String(id));

            if (userSocket) {
                onlineUser.push(id);
            }
        });

        console.log('Online users: ' + onlineUser);

        client.emit('online-users', onlineUser);
    }

    @SubscribeMessage('messages-list-invalidate')
    async handleMessageListRefresh(
        @MessageBody() dto: { userId: string; chatId: string },
    ) {
        const friendSocket = this.activeSockets.get(String(dto.chatId));

        if (friendSocket) {
            friendSocket.emit('messages-list-invalidate', {
                friendId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.chatId} is not connected`);
        }
    }

    @SubscribeMessage('messages-user-list-invalidate')
    async handleUserListRefresh(
        @MessageBody() dto: { userId: string; chatId: string },
    ) {
        const friendSocket = this.activeSockets.get(String(dto.chatId));

        if (friendSocket) {
            friendSocket.emit('messages-user-list-invalidate', {
                friendId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.chatId} is not connected`);
        }
    }

    @SubscribeMessage('messages-read')
    async handleMessageRead(
        @MessageBody()
        dto: {
            message_id: string;
            chat_id: string;
            user_id: string;
            friend_id: string;
            read_at: string;
        }[],
        @ConnectedSocket() client: any,
    ) {
        const groupedMessages = dto.reduce(
            (acc, curr) => {
                acc[curr.friend_id] = acc[curr.friend_id] || [];
                acc[curr.friend_id].push(curr);
                return acc;
            },
            {} as Record<
                string,
                { message_id: string; read_at: string; user_id: string }[]
            >,
        );

        for (const [friend_id, messages] of Object.entries(groupedMessages)) {
            const friendSocket = this.activeSockets.get(friend_id);

            messages.forEach((message) => {
                const messageWithFriendId = {
                    ...message,
                    friend_id: friend_id, // Явное указание friend_id
                    user_id: message.user_id, // Извлечение user_id из сообщения
                };

                if (friendSocket) {
                    friendSocket.emit('messages-read', messageWithFriendId);
                } else {
                    console.log(`Friend ${friend_id} is not connected`);
                }
            });
        }

        await firstValueFrom(
            this.messageClient.send('update.message.status', dto),
        );
        // await this.messageService.updateMessageRead(dto);
    }
}
