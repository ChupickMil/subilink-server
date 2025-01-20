import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as fs from 'fs/promises'
import * as path from 'path'
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
        imgUuids?: string[],
    ) {
        return await this.prisma.message.create({
            data: {
                sender_id: Number(sender_id),
                chat_id: Number(chatId),
                content: content,
                img_uuids: imgUuids ?? [],
            },
            select: {
                id: true,
                chat_id: true,
                sender_id: true,
                read_at: true,
                content: true,
                img_uuids: true,
                video_url: true,
                send_at: true,
            },
        });
    }

    public async getMessages(
        userId: string,
        senderId: string,
        param: string | null,
        search?: string,
    ) {
        if (!senderId || !userId) return;

        const chatId = await this.chatService.getChatId(userId, senderId);

        const paramQuery =
            param != null && !isNaN(Number(param))
                ? { id: { lt: Number(param) } }
                : {};

        const searchQuery = search
            ? {
                  content: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                  },
              }
            : {};

        // const searchSelect = search ?
        const messages = await this.prisma.message.findMany({
            where: {
                chat_id: Number(chatId),
                ...paramQuery,
                ...searchQuery,
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
                img_uuids: true,
                video_url: true,
                send_at: true,
                user: {
                    select: {
                        name: true,
                    },
                },
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

        if(!chatId) throw new Error("Chat id not found")

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
        const updatePromises = dto.map(
            async (message) =>
                await this.prisma.message.update({
                    where: {
                        id: Number(message.message_id),
                    },
                    data: {
                        read_at: new Date(message.read_at),
                    },
                }),
        );

        await Promise.all(updatePromises);
    }

    async saveFile(
        userId: string,
        files: Express.Multer.File[],
        uuids: string[],
    ) {
        const userDir = path.join('uploads', String(userId));

        try {
            if (await !fs.access(userDir)) {
                await fs.mkdir(userDir, { recursive: true });
            }
        } catch (err) {
            throw new Error('Failed to create directory for user files');
        }

        const filePromises = files.map(async (file, i) => {
            const typeParts = file.originalname.split('.');
            const typeFile = '.' + typeParts[typeParts.length - 1];

            const originalName = Buffer.from(
                file.originalname,
                'latin1',
            ).toString('utf8');

            const filePath = path.join(userDir, uuids[i] + typeFile);
            console.log(filePath);

            try {
                const fullPath = path.join(process.cwd(), filePath);
                await fs.writeFile(fullPath, file.buffer);

                await this.prisma.file.create({
                    data: {
                        uuid: uuids[i],
                        path: fullPath,
                        type: typeFile,
                        size: file.size,
                        mime_type: file.mimetype,
                        original_name: originalName,
                        user_id: Number(userId),
                    },
                });
            } catch (err) {
                console.log(err);
                throw new Error(`Failed to save file ${originalName}`);
            }
        });

        await Promise.all(filePromises);
    }

    async getImage(
        uuid: string,
    ): Promise<{ path: string; original_name: string, mime_type: string } | undefined | null> {
        const img = await this.prisma.file.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                path: true,
                original_name: true,
                mime_type: true
            },
        });

        return img;
    }
}
