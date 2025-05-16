import { UseGuards } from '@nestjs/common'
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
import { SocketService } from './socket.service'
import { IChatMessageDto, IFriendsRequestDto, IMessagesReadDto } from './types'

@WebSocketGateway({
    cors: {
        origin: [
            'http://localhost:3000',
            'https://sabilink.ru:3000',
            'https://sabilink.ru',
            'http://client:3000',
            'http://172.28.0.5:3000',
            'https://localhost:3000',
            'http://192.168.31.60:3000',
            'https://192.168.31.60:3000',
            'http://192.168.31.179:3000',
            'https://192.168.31.179:3000',
        ], // точный домен
    },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(private readonly socketService: SocketService) {}

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
        @ConnectedSocket() client: Socket,
    ) {
        return await this.socketService.handleMessages(
            dto,
            client,
            this.activeSockets,
        );
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('friends-request')
    async handleFriendsRequests(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: any,
    ) {
        return await this.socketService.handleFriendsRequests(
            dto,
            client,
            this.activeSockets,
        );
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('friends-accept-requests')
    async handleFriendsAcceptRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: Socket,
    ) {
        return await this.socketService.handleFriendsAcceptRequest(
            dto,
            client,
            this.activeSockets,
        );
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('friends-cancel-outgoing-request')
    async handleFriendsCancelRequest(
        @MessageBody() dto: IFriendsRequestDto,
        @ConnectedSocket() client: Socket,
    ) {
        const { userId, friendId } = dto;

        await this.socketService.cancelOutgoingRequest(userId, friendId);

        client.emit('friends-cancel-outgoing-request', { success: true });
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('online-users')
    async handleOnlineUser(
        @MessageBody() dto: number[],
        @ConnectedSocket() client: Socket,
    ) {
        const onlineUser = await this.socketService.getOnlineUsers(
            dto,
            this.activeSockets,
        );

        client.emit('online-users', onlineUser);
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('messages-list-invalidate')
    async handleMessageListRefresh(
        @MessageBody() dto: { userId: number; chatId: number },
    ) {
        return await this.socketService.handleMessageListRefresh(
            dto,
            this.activeSockets,
        );
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('messages-user-list-invalidate')
    async handleUserListRefresh(
        @MessageBody() dto: { userId: number; chatId: number },
    ) {
        return await this.socketService.handleUserListRefresh(
            dto,
            this.activeSockets,
        );
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('messages-read')
    async handleMessageRead(
        @MessageBody()
        dto: IMessagesReadDto[],
        @ConnectedSocket() client: Socket,
    ) {
        return await this.socketService.handleMessageRead(
            dto,
            client,
            this.activeSockets,
        );
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('save-geolocation')
    async saveGeolocation(
        @MessageBody() dto: [number, number],
        @SocketUser() user: number,
    ) {
        await this.socketService.saveGeolocation(
            user,
            dto,
            this.activeSockets,
        );

        await this.socketService.updateTimeWithFriends(user)
    }

    @UseGuards(SocketAuthenticatedGuard)
    @SubscribeMessage('shake')
    async handleShake(
        @ConnectedSocket() client: Socket,
        @SocketUser() user: number,
    ) {
        return await this.socketService.handleShake(
            user,
            client,
            this.activeSockets,
        );
    }
}
