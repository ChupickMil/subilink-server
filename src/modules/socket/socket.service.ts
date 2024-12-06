import { Injectable } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets'
import { FriendService } from '../friend/friend.service'

interface IChatMessageDto {
    userId: string;
    chatId: string;
    message: string;
    time: string;
}

interface IFriendsRequestDto {
    id: string;
    friendId: string; // ID друга, которому отправляется запрос
}

@Injectable()
@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class SocketService implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly friendService: FriendService,
    ) {}
    private activeSockets = new Map<string, any>(); // Хранилище сокетов (userId -> сокет)

    handleConnection(client: any) {
        // Пример: получаем userId из query параметров соединения
        const userId = client.handshake.query.userId;
        console.log(client)
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
    handleEvent(
        @MessageBody() dto: IChatMessageDto,
        @ConnectedSocket() client: any,
    ) {
        console.log(dto);
        const res = { dto };
        client.emit('message', res.dto);
    }

    @SubscribeMessage('friends-requests')
    async handleFriendsRequests(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        console.log(dto);

        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.friendId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('friends-requests-notification', {
                message: `Новый запрос в друзья от пользователя ${dto.id}`,
                requesterId: dto.id,
            });

        } else {
            console.log(`Friend ${dto.friendId} is not connected`);
        }
        
        await this.friendService.addFriend(dto.id, dto.friendId)

        // Подтверждаем действие инициатору
        client.emit('friends-requests', { success: true });
    }
}
