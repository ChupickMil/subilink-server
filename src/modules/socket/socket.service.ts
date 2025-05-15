import { Injectable } from '@nestjs/common'
import { Socket } from 'socket.io'
import { ChatService } from '../chat/chat.service'
import { FriendService } from '../friend/friend.service'
import { MapService } from '../map/map.service'
import { MessageService } from '../message/message.service'
import { RedisService } from '../redis/redis.service'
import { UserService } from '../user/user.service'
import { IChatMessageDto, IFriendsRequestDto, IMessagesReadDto } from './types'

@Injectable()
export class SocketService {
    constructor(
        private readonly friendService: FriendService,
        private readonly mapService: MapService,
        private readonly redis: RedisService,
        private readonly messageService: MessageService,
        private readonly userService: UserService,
        private readonly chatService: ChatService,
    ) {}

    async getOnlineUsers(userIds: number[], activeSockets: Map<string, any>) {
    try {
        const onlineUsers = userIds.map((id: number) => {
            const user = activeSockets.get(String(id));
            
            if(user) {
                return id
            }
        });

        return onlineUsers.filter((user) => user !== null);
    } catch (error) {
        throw new Error("Failed to get online users");
    }
}

    async cancelOutgoingRequest(userId: number, friendId: number) {
        await this.friendService.cancelOutgoingRequest(userId, friendId);
    }

    async saveGeolocation(
        user: number,
        position: [number, number],
        activeSockets: Map<string, any>,
    ) {
        const friendsIds = await this.friendService.getFriendIds(user);

        for (const id of friendsIds) {
            const friendSocket = activeSockets.get(String(id));

            if (friendSocket) {
                friendSocket.emit('friend-geolocation', {
                    friendId: user,
                    position: position,
                });
            }
        }

        await this.mapService.saveGeolocation(user, position);
    }

    async updateTimeWithFriends(user: number) {
        const pos = await this.redis.getGeo(user)

        if(!pos[0]) return

        const nearbyUsers = await this.getNearbyUsers(pos[0], 100);

        
    }

    async setShake(userId: number) {
        await this.redis.set(`shake:user:${userId}`, true, 1000);
    }

    async getGeo(userId: number) {
        return await this.redis.getGeo(userId);
    }

    async getNearbyUsers(
        geo: {
            longitude: string;
            latitude: string;
        },
        radius: number,
    ) {
        return await this.redis.getGeoSearch(geo, radius);
    }

    async handleShake(
        userId: number,
        client: Socket,
        activeSockets: Map<string, any>,
    ) {
        await this.setShake(userId);

        const userGeo = await this.getGeo(userId);

        if (!userGeo[0]) return;

        const nearbyUsers = await this.getNearbyUsers(userGeo[0], 100);

        const nearbyUsersIds = nearbyUsers
            .map((nearbyUser) =>
                Number(nearbyUser.split(':')[1]) !== Number(userId)
                    ? Number(nearbyUser.split(':')[1])
                    : null,
            )
            .filter((id) => id && id);

        const friendsIds = await this.friendService.getFriendIds(userId);

        friendsIds.map(async (id) => {
            if (!nearbyUsersIds.includes(Number(id))) return;

            const friendSocket = activeSockets.get(String(id));

            if (friendSocket) {
                const isShake = await this.redis.get(`shake:user:${id}`);

                if (isShake) {
                    const res = await this.mapService.shake(userId, id);
                    if (!res) return;

                    client.emit('shake', res);
                }
            }
        });
    }

    async handleMessageRead(
        dto: IMessagesReadDto[],
        client: Socket,
        activeSockets: Map<string, any>,
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
            const friendSocket = activeSockets.get(friend_id);

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

        await this.messageService.updateMessageStatus(dto);
    }

    async handleUserListRefresh(
        { chatId, userId }: { chatId: number; userId: number },
        activeSockets: Map<string, any>,
    ) {
        const friendSocket = activeSockets.get(String(chatId));

        if (friendSocket) {
            friendSocket.emit('messages-user-list-invalidate', {
                friendId: userId,
            });
        }
    }

    async handleMessageListRefresh(
        { chatId, userId }: { chatId: number; userId: number },
        activeSockets: Map<string, any>,
    ) {
        const friendSocket = activeSockets.get(String(chatId));

        if (friendSocket) {
            friendSocket.emit('messages-list-invalidate', {
                friendId: userId,
            });
        }
    }

    async handleFriendsAcceptRequest(
        { userId, friendId }: IFriendsRequestDto,
        client: Socket,
        activeSockets: Map<string, any>,
    ) {
        // обновляем бд
        await this.friendService.acceptRequest(userId, friendId);

        // Получаем сокет друга
        const friendSocket = activeSockets.get(String(friendId));

        const senderName = await this.userService.getUserWithSelect(
            Number(userId),
            { name: true },
        );

        if (friendSocket && senderName) {
            // Уведомляем друга
            friendSocket.emit('friends-request-accept-notification', {
                message: `Ваш запрос принял ${userId}`,
                requesterId: userId,
                senderName: senderName.name,
                acceptedAt: new Date(),
                userId: userId,
            });
        }

        // Подтверждаем действие инициатору
        client.emit('friends-accept-request', { success: true });
    }

    async handleFriendsRequests(
        { userId, friendId }: IFriendsRequestDto,
        client: Socket,
        activeSockets: Map<string, any>,
    ) {
        // записываем в бд
        await this.friendService.addFriend(userId, friendId);

        // Получаем сокет друга
        const friendSocket = activeSockets.get(String(friendId));

        const senderName = await this.userService.getUserWithSelect(
            Number(userId),
            { name: true },
        );

        if (friendSocket && senderName) {
            // Уведомляем друга
            friendSocket.emit('friends-request-notification', {
                message: `Новый запрос в друзья от пользователя ${userId}`,
                requesterId: userId,
                senderName: senderName.name,
                sendAt: new Date(),
                userId: userId,
            });
        }

        // Подтверждаем действие инициатору
        client.emit('friends-request', { success: true });
    }

    async handleMessages(
        dto: IChatMessageDto,
        client: Socket,
        activeSockets: Map<string, any>,
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
        const friendSocket = activeSockets.get(String(recipientId));

        if (friendSocket && senderName) {
            // Уведомляем друга
            friendSocket.emit('messages-notification', {
                ...result,
                userId,
                recipientId,
                senderName: senderName.name,
            });
        }
    }
}
