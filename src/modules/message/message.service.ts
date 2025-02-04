import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as fs from 'fs/promises'
import * as path from 'path'
import { ChatService } from '../chat/chat.service'
import { PrismaService } from '../prisma/prisma.service'
import { ModalButtonAnswers } from './types'

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
        files?: string[],
    ) {
        const filesToConnect = Array<{ id: number }>();

        if (files?.length) {
            for (const uuid of files) {
                const file = await this.prisma.file.findUnique({
                    where: {
                        uuid: uuid,
                    },
                });

                if (file && file.id) {
                    filesToConnect.push({ id: file.id });
                } else {
                    console.log(`File with uuid ${uuid} not found`);
                }
            }
        }

        return await this.prisma.message.create({
            data: {
                sender_id: Number(sender_id),
                chat_id: Number(chatId),
                content: content,
                files: {
                    connect: filesToConnect,
                },
            },
            select: {
                id: true,
                chat_id: true,
                sender_id: true,
                read_at: true,
                content: true,
                files: true,
                send_at: true,
            },
        });
    }

    public async getPublicMessages(
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

        const messages = await this.prisma.message.findMany({
            where: {
                chat_id: Number(chatId),
                OR: [
                    { delete_for: { equals: null } },
                    {
                        NOT: [
                            {
                                OR: [
                                    { delete_for: { has: Number(userId) } },
                                    {
                                        delete_for: {
                                            has: ModalButtonAnswers.DELETE_EVERYONE,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
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
                files: true,
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

        if (!chatId) throw new Error('Chat id not found');

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
            await fs.access(userDir).catch(async () => {
                await fs.mkdir(userDir, { recursive: true });
            });
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
        userId: string,
    ): Promise<
        | { path: string; original_name: string; mime_type: string }
        | undefined
        | null
    > {
        const img = await this.prisma.file.findFirst({
            where: {
                uuid: uuid,
                Message: {
                    some: {
                        chat: {
                            OR: [
                                {
                                    first_user: Number(userId),
                                },
                                {
                                    second_user: Number(userId),
                                },
                            ],
                        },
                    },
                },
            },
            select: {
                path: true,
                original_name: true,
                mime_type: true,
            },
        });

        return img;
    }

    async downloadFile(uuid: string, userId: string) {
        const file = await this.prisma.file.findFirst({
            where: {
                uuid: uuid,
                user_id: Number(userId),
            },
            select: {
                path: true,
                original_name: true,
                mime_type: true,
            },
        });

        return file;
    }

    public async deleteMessages(
        ids: string[],
        forEveryone: ModalButtonAnswers,
        userId: string,
    ) {
        const isForEveryone =
            Number(ModalButtonAnswers.DELETE_EVERYONE) === Number(forEveryone);

        const messagesProperties = { delete_for: true };
        const messagesDeleteFor = await this.getMessagesProperties(
            ids,
            messagesProperties,
        );

        await Promise.all(
            messagesDeleteFor.map(async (msg, i) => {
                await this.prisma.message.update({
                    where: {
                        id: Number(ids[i]),
                        chat: {
                            OR: [
                                {
                                    first_user: Number(userId),
                                },
                                {
                                    second_user: Number(userId),
                                },
                            ],
                        },
                    },
                    data: {
                        deleted_at: new Date(),
                        delete_for: isForEveryone
                            ? [ModalButtonAnswers.DELETE_EVERYONE]
                            : [...msg.delete_for, Number(userId)],
                    },
                });
            }),
        );
    }

    private async getMessagesProperties<T extends keyof Prisma.MessageSelect>(
        ids: string[],
        select: Record<T, boolean>,
    ) {
        return this.prisma.message.findMany({
            where: {
                id: {
                    in: ids.map(Number),
                },
            },
            select,
        });
    }
}
