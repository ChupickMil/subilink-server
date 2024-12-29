import { Injectable } from '@nestjs/common'
import { ChatService } from '../chat/chat.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MessageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly chatService: ChatService,
    ) {}

    public async getLastMessage(chatId: string) {
        const lastMessage = await this.prisma.message.findFirst({
            where: {
                chat_id: Number(chatId),
            },
        });
        return lastMessage;
    }

    public async sendNewMessageChat(
        sender_id: string,
        chatId: string,
        content: string,
    ) {
        return await this.prisma.message.create({
            data: {
                sender_id: Number(sender_id),
                chat_id: Number(chatId),
                content: content,
            },
            select: {
                id: true,
                chat_id: true,
                sender_id: true,
                read_at: true,
                content: true,
                img_url: true,
                video_url: true,
                send_at: true,
            },
        });
    }

    public async getMessages(userId: string, senderId: string) {
        if (!senderId || !userId) return;

        const chatId = await this.chatService.getChatId(userId, senderId);

        const messages = await this.prisma.message.findMany({
            where: {
                chat_id: Number(chatId),
            },
            orderBy: {
                send_at: 'desc',
            },
            take: 50,
            select: {
                id: true,
                chat_id: true,
                sender_id: true,
                read_at: true,
                content: true,
                img_url: true,
                video_url: true,
                send_at: true,
            },
        });

        return messages
            .map((message) => ({
                ...message,
                send_at: message.send_at,
            }))
            .reverse();
    }

    public async getUpdatedLastMessage(userId: string, senderId: string) {
        const chatId = await this.chatService.getChatId(userId, senderId);

        const lastMessage = await this.prisma.message.findMany({
            where: {
                chat_id: chatId,
            },
            orderBy: {
                created_at: 'desc',
            },
            take: 1,
            select: {
                sender_id: true,
                content: true,
                send_at: true,
            },
        });

        return lastMessage[0];
    }

    async updateMessageRead(
        dto: { message_id: string; chat_id: string; read_at: string }[],
    ) {
        const updatePromises = dto.map(async (message) =>
            await this.prisma.message.update({
                where: {
                    id: Number(message.message_id)
                },
                data: {
                    read_at: new Date(message.read_at),
                },
            }),
        );

        await Promise.all(updatePromises);
    }
}
