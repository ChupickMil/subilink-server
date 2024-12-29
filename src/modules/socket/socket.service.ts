import { Injectable } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets'
import { ChatService } from '../chat/chat.service'
import { FriendService } from '../friend/friend.service'
import { MessageService } from '../message/message.service'

interface IChatMessageDto {
    userId: string;
    recipientId: string;
    content: string;
    time: string;
}

interface IFriendsRequestDto {
    userId: string;
    friendId: string; // ID друга, которому отправляется запрос
}

@Injectable()
@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3000', // точный домен
    },
})
export class SocketService implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly friendService: FriendService,
        private readonly chatService: ChatService,
        private readonly messageService: MessageService,
    ) {}
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

    @SubscribeMessage('message')
    async handleEvent(
        @MessageBody() dto: IChatMessageDto,
        @ConnectedSocket() client: any,
    ) {
        const { userId, recipientId, content } = dto;

        // Проверяем существование чата или создаем новый
        const isHasChat = await this.chatService.getIsHasChat(
            userId,
            recipientId,
        );
        if (!isHasChat) {
            await this.chatService.createChat(userId, recipientId);
        }

        // Получаем ID чата
        const chatId = String(
            await this.chatService.getChatId(userId, recipientId),
        );

        // Отправляем сообщение
        const result = await this.messageService.sendNewMessageChat(
            userId,
            chatId,
            content,
        );

        // Уведомляем отправителя
        client.emit('message', { ...result, userId, recipientId });

        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(recipientId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('message-notification', {
                ...result,
                userId,
                recipientId,
            });
        } else {
            console.log(`Friend ${recipientId} is not connected`);
        }
    }

    @SubscribeMessage('friend-request')
    async handleFriendsRequests(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.friendId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('friends-requests-notification', {
                message: `Новый запрос в друзья от пользователя ${dto.userId}`,
                requesterId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.friendId} is not connected`);
        }

        // записываем в бд
        await this.friendService.addFriend(dto.userId, dto.friendId);

        // Подтверждаем действие инициатору
        client.emit('friends-requests', { success: true });
    }

    @SubscribeMessage('friend-accept-request')
    async handleFriendsAcceptRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.friendId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('friend-request-notification', {
                message: `Ваш запрос принял ${dto.userId}`,
                requesterId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.friendId} is not connected`);
        }

        // обновляем бд
        await this.friendService.acceptRequest(dto.userId, dto.friendId);

        // Подтверждаем действие инициатору
        client.emit('friend-accept-request', { success: true });
    }

    @SubscribeMessage('friend-cancel-outgoing-request')
    async handleFriendsCancelRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // обновляем бд
        await this.friendService.cancelOutgoingRequest(
            dto.userId,
            dto.friendId,
        );

        // Подтверждаем действие инициатору
        client.emit('friend-cancel-outgoing-request', { success: true });
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

    @SubscribeMessage('message-read')
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

        console.log(groupedMessages);

        for (const [friend_id, messages] of Object.entries(groupedMessages)) {
            const friendSocket = this.activeSockets.get(friend_id);

            messages.forEach((message) => {
                const messageWithFriendId = {
                    ...message,
                    friend_id: friend_id, // Явное указание friend_id
                    user_id: message.user_id, // Извлечение user_id из сообщения
                };

                if (friendSocket) {
                    friendSocket.emit('message-read', messageWithFriendId);
                } else {
                    console.log(`Friend ${friend_id} is not connected`);
                }
            });
        }

        await this.messageService.updateMessageRead(dto);

        // client.emit('online-users', onlineUser);
    }
}
