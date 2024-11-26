import { Injectable } from '@nestjs/common'
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets'

interface IChatMessageDto {
	userId: string,
	chatId: string,
	message: string,
	time: string
}

@Injectable()
@WebSocketGateway({
		cors: {
			origin: "*"
		}
	}
)
export class SocketService implements OnGatewayDisconnect {
	handleDisconnect(client: any) {
		// console.log(client)
	}

	@SubscribeMessage('message')
	handleEvent(@MessageBody() dto: IChatMessageDto, @ConnectedSocket() client: any) {
		console.log(dto)
		const res = { dto }
		client.emit("message", res.dto)
		// console.log(res)
	}
}
