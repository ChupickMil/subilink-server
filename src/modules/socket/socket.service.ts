import { Injectable, UseGuards } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { SocketUser } from 'src/common/decorators/UserSocket.decorator'
import { SocketAuthenticatedGuard } from 'src/common/guards/SocketAuthenticatedGuard'
import { ChatService } from '../chat/chat.service'
import { FriendService } from '../friend/friend.service'
import { MessageService } from '../message/message.service'
import { RedisService } from '../redis/redis.service'
import { UserService } from '../user/user.service'
import { MapService } from './../map/map.service'
import { IChatMessageDto, IFriendsRequestDto } from './types'

@Injectable()
@WebSocketGateway({
    cors: {
        origin: ['http://192.168.31.179:3000', 'http://localhost:3000'], // точный домен
    },
})
export class SocketService implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly chatService: ChatService,
        private readonly userService: UserService,
        private readonly messageService: MessageService,
        private readonly friendService: FriendService,
        private readonly mapService: MapService ,
        private readonly redis: RedisService
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

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('messages')
    async handleEvent(
        @MessageBody() dto: IChatMessageDto,
        @ConnectedSocket() client: any,
    ) {
        const { userId, recipientId, content, fileUuids, replyMessageId } = dto;

        // Проверяем существование чата или создаем новый
        const isHasChat = await this.chatService.getIsHasChat(
            userId,
            recipientId,
        );

        const isDeletedChat = await this.chatService.getIsDeletedChat(
            userId,
            recipientId,
        );

        if (isDeletedChat) {
            await this.chatService.recoveryChat(userId, recipientId);
        }

        if (!isHasChat) {
            const isCreated = await this.chatService.createChat(
                userId,
                recipientId,
            );
            if (!isCreated) throw new Error('Failed to create chat');
        }

        // Получаем ID чата
        const chatId = await this.chatService.getChatId(userId, recipientId);

        if (!chatId) throw new Error('Chat not found');

        // Отправляем сообщение
        const result = await this.messageService.sendNewMessageChat(
            Number(userId),
            chatId,
            content,
            replyMessageId,
            fileUuids,
        );

        const senderName = await this.userService.getUserWithSelect(
            Number(userId),
            {
                name: true,
            },
        );

        // Уведомляем отправителя
        client.emit('messages', { ...result, userId, recipientId });

        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(recipientId));

        if (friendSocket && senderName) {
            // Уведомляем друга
            friendSocket.emit('messages-notification', {
                ...result,
                userId,
                recipientId,
                senderName: senderName.name,
            });
        } else {
            console.log(`Friend ${recipientId} is not connected`);
        }
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('friends-request')
    async handleFriendsRequests(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // записываем в бд
        await this.friendService.addFriend(dto.userId, dto.friendId)

        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.friendId));

        const senderName = await this.userService.getUserWithSelect(Number(dto.userId), { name: true })

        if (friendSocket && senderName) {
            // Уведомляем друга
            friendSocket.emit('friends-request-notification', {
                message: `Новый запрос в друзья от пользователя ${dto.userId}`,
                requesterId: dto.userId,
                senderName: senderName.name,
                sendAt: new Date(),
                userId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.friendId} is not connected`);
        }

        // Подтверждаем действие инициатору
        client.emit('friends-request', { success: true });
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('friends-accept-requests')
    async handleFriendsAcceptRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // обновляем бд
        await this.friendService.acceptRequest(dto.userId, dto.friendId)

        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.friendId));

        const senderName = await this.userService.getUserWithSelect(Number(dto.userId), { name: true })

        if (friendSocket && senderName) {
            // Уведомляем друга
            friendSocket.emit('friends-request-accept-notification', {
                message: `Ваш запрос принял ${dto.userId}`,
                requesterId: dto.userId,
                senderName: senderName.name,
                acceptedAt: new Date(),
                userId: dto.userId,
            });
        } else {
            console.log(`Friend ${dto.friendId} is not connected`);
        }

        // Подтверждаем действие инициатору
        client.emit('friends-accept-request', { success: true });
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('friends-cancel-outgoing-request')
    async handleFriendsCancelRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        // обновляем бд
        await this.friendService.cancelOutgoingRequest(dto.userId, dto.friendId)

        // Подтверждаем действие инициатору
        client.emit('friends-cancel-outgoing-request', { success: true });
    }

    @UseGuards(SocketAuthenticatedGuard)
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

    @UseGuards(SocketAuthenticatedGuard)
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

    @UseGuards(SocketAuthenticatedGuard)
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

    @UseGuards(SocketAuthenticatedGuard)
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
        @ConnectedSocket() client: Socket,
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

        await this.messageService.updateMessageStatus(dto)
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('save-geolocation')
    async saveGeolocation(
        @MessageBody() dto: [number, number],
        @ConnectedSocket() client: Socket,
        @SocketUser() user: number,
    ) {
        const friendsIds = await this.friendService.getFriendIds(user)

        friendsIds.map((id) => {
            const friendSocket = this.activeSockets.get(String(id));

            if (friendSocket) {
                friendSocket.emit('friend-geolocation', {
                    friendId: user,
                    position: dto,
                });
            } else {
                console.log(`Friend ${id} is not connected`);
            }
        });

        await this.mapService.saveGeolocation(user, dto);
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('save-shake')
    async saveShake(
        @ConnectedSocket() client: Socket,
        @SocketUser() user: number,
    ) {
        await this.redis.set(`shake:user:${user}`, true, 1000);
    }
}
