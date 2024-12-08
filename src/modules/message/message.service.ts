import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MessageService {
	constructor(private readonly prisma: PrismaService){}

	public async getLastMessage(chatId: string){
		const lastMessage = await this.prisma.message.findFirst({
			where: {
				chat_id: Number(chatId)
			}
		})
		console.log(lastMessage)
		return lastMessage
	}

	public async sendNewMessageChat(sender_id: string, chatId: string, content: string){
		await this.prisma.message.create({
			data: {
				sender_id: Number(sender_id),
				chat_id: Number(chatId),
				content: content
			}
		})
	}
}
