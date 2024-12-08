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
        console.log(dto);
        const res = { dto };
        client.emit('message', res.dto);

        const userId = res.dto.userId;
        const recipientId = res.dto.recipientId;
        const message = res.dto.message
        const isHasChat = await this.chatService.getIsHasChat(userId, recipientId);

        if(isHasChat){
            const chatId = String(await this.chatService.getChatId(userId, recipientId))
            await this.messageService.sendNewMessageChat(userId, chatId, message)
        } else {
            await this.chatService.createChat(userId, recipientId)
        }

        // Получаем сокет друга
        const friendSocket = this.activeSockets.get(String(dto.recipientId));

        if (friendSocket) {
            // Уведомляем друга
            friendSocket.emit('message-notification', {
                message: `Новое сообщение ${dto.recipientId}`,
                requesterId: dto.recipientId,
            });

        } else {
            console.log(`Friend ${dto.recipientId} is not connected`);
        }
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
