import { Injectable } from '@nestjs/common'
import { File, Prisma } from '@prisma/client'
import { ModalButtonAnswers } from 'src/common/@types/types'
import { ChatService } from '../chat/chat.service'
import { FileService } from '../file/file.service'
import { PrismaService } from '../prisma/prisma.service'
import { UserService } from '../user/user.service'

@Injectable()
export class MessageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly fileService: FileService,
        private readonly userService: UserService,
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
        sender_id: number,
        chatId: number,
        content: string,
        replyMessageId: string,
        files?: string[],
    ) {
        const newFiles: File[] = [];

        if (files?.length) {
            const resolvedFiles = await Promise.all(
                files.map(async (uuid) => {
                    return await this.fileService.getFileByUuid(uuid);
                }),
            );

            const validFiles = resolvedFiles.filter(
                (file): file is NonNullable<typeof file> => file !== null,
            );

            if (!validFiles.length) return;

            newFiles.push(...validFiles);
        }

        const createdMessage = await this.prisma.message.create({
            data: {
                sender_id: Number(sender_id),
                chat_id: Number(chatId),
                content: content,
                reply_id: Number(replyMessageId),
                file_ids: newFiles.map((file) => String(file.id)),
            },
            select: {
                id: true,
                chat_id: true,
                sender_id: true,
                read_at: true,
                content: true,
                file_ids: true,
                send_at: true,
                reply_id: true,
            },
        });

        if (createdMessage.reply_id) {
            const replyMessage = await this.prisma.message.findFirst({
                where: {
                    id: createdMessage.reply_id,
                },
                select: {
                    id: true,
                    content: true,
                    sender_id: true,
                },
            });

            if (!replyMessage?.sender_id) return;

            const replyMessageWithUser =
                await this.userService.getUserWithSelect(
                    replyMessage.sender_id,
                    {
                        name: true,
                    },
                );

            return {
                ...createdMessage,
                reply: {
                    ...replyMessage,
                    ...replyMessageWithUser,
                },
                files: newFiles,
            };
        }

        return {
            ...createdMessage,
            files: newFiles,
        };
    }

    public async getMessageForChats(userIds: string[] | number[]) {
        return await this.prisma.message.findMany({
            where: {
                OR: [
                    { delete_for: { equals: null } },
                    {
                        NOT: [
                            {
                                OR: [
                                    {
                                        delete_for: {
                                            has: Number(userIds),
                                        },
                                    },
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
            },
            orderBy: {
                created_at: 'desc',
            },
            take: 1,
            select: {
                read_at: true,
                sender_id: true,
                content: true,
                created_at: true,
                file_ids: true,
                chat_id: true,
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

        try {
            const chatId = await this.chatService.getChatId(userId, senderId);

            if (!chatId) {
                console.error('Chat ID not found');
                return [];
            }

            const paramQuery =
                param != null && !isNaN(Number(param))
                    ? { id: { lt: Number(param) } }
                    : {};

            const searchQuery = search
                ? {
                      content: {
                          contains: String(search),
                          mode: Prisma.QueryMode.insensitive,
                      },
                  }
                : {};

            let messages = await this.prisma.message.findMany({
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
                orderBy: { send_at: 'desc' },
                take: 50,
                select: {
                    id: true,
                    chat_id: true,
                    sender_id: true,
                    read_at: true,
                    content: true,
                    file_ids: true,
                    send_at: true,
                    reply_id: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            if (search && messages.length > 0) {
                const userIds = [
                    ...new Set(messages.map((msg) => msg.sender_id)),
                ];

                if (userIds.length > 0) {
                    const users = await this.userService.getUsersSelect(
                        userIds,
                        {
                            id: true,
                            name: true,
                        },
                    );

                    const userMap = new Map(
                        users.map((user) => [user.id, user]),
                    );

                    messages = messages.map((message) => ({
                        ...message,
                        user: userMap.get(message.sender_id)!, // !!!
                    }));
                }
            }

            const fileIds = [
                ...new Set(messages.flatMap((msg) => msg.file_ids)),
            ];

            let filesMap = new Map();

            if (fileIds.length > 0) {
                const files = await this.fileService.getFiles(fileIds);

                filesMap = new Map(files.map((file: any) => [file.id, file]));
            }

            const withReplyMessages = await Promise.all(
                messages.map(async (message) => {
                    if (!message.reply_id) {
                        return {
                            id: message.id,
                            content: message.content,
                            file_ids: message.file_ids,
                            read_at: message.read_at,
                            send_at: message.send_at,
                            sender_id: message.sender_id,
                            chat_id: message.chat_id,
                            user: message.user,
                            files: message.file_ids
                                .map((id) => filesMap.get(Number(id)))
                                .filter(Boolean),
                        };
                    }

                    const replyMessage = await this.prisma.message.findFirst({
                        where: {
                            id: message.reply_id,
                        },
                        select: {
                            id: true,
                            content: true,
                            sender_id: true,
                        },
                    });

                    let replyMessageWithUser;

                    if (replyMessage) {
                        replyMessageWithUser =
                            await this.userService.getUserWithSelect(
                                replyMessage.sender_id,
                                {
                                    name: true,
                                },
                            );
                    }

                    return {
                        id: message.id,
                        content: message.content,
                        file_ids: message.file_ids,
                        read_at: message.read_at,
                        send_at: message.send_at,
                        sender_id: message.sender_id,
                        chat_id: message.chat_id,
                        user: message.user,
                        reply: {
                            ...replyMessage,
                            ...replyMessageWithUser,
                        },
                        files: message.file_ids
                            .map((id) => filesMap.get(Number(id)))
                            .filter(Boolean),
                    };
                }),
            );

            return withReplyMessages.reverse();
        } catch (error) {
            console.error('Error in getPublicMessages:', error);
            return [];
        }
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

    async updateMessageStatus(
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

        await Promise.allSettled(updatePromises);
    }

    async saveFile(
        files: {
            uuid: string;
            path: string;
            type: string;
            size: number;
            mime_type: string;
            original_name: string;
            user_id: number;
        }[],
    ) {
        if (!files.length) return;
        try {
            await Promise.all(
                files.map(async (file) => {
                    return await this.fileService.createFile(
                        file.uuid,
                        file.path,
                        file.type,
                        file.size,
                        file.mime_type,
                        file.original_name,
                        Number(file.user_id),
                    );
                }),
            );
        } catch (err) {
            console.log(err);
        }
    }

    private async getIsUserChatAccess(chatId: number, userId) {
        try {
            return !!(await this.chatService.checkUserChatAccess(
                chatId,
                userId,
            ));
        } catch (error) {
            console.error('Error in getIsUserChatAccess:', error);
            return false;
        }
    }

    async getImage(uuid: string, userId: number) {
        try {
            const img = await this.fileService.getFileByUuidSelect(
                uuid,
                userId,
                {
                    id: true,
                    path: true,
                    original_name: true,
                    mime_type: true,
                },
            );

            if (!img) {
                console.error('File not found');
                return null;
            }

            const message = await this.prisma.message.findFirst({
                where: {
                    file_ids: {
                        has: String(img.id),
                    },
                },
                select: {
                    chat_id: true,
                },
            });

            if (!message || !message.chat_id) {
                console.error('Message not found');
                return null;
            }

            const isAccess = await this.getIsUserChatAccess(
                message.chat_id,
                userId,
            );

            if (isAccess !== true) {
                console.error('Access denied');
                return null;
            }

            return img;
        } catch (error) {
            console.error('Error in getImage:', error);
            return null;
        }
    }

    async getFileForDownload(uuid: string) {
        return await this.prisma.file.findFirst({
            where: {
                uuid: uuid,
            },
            select: {
                path: true,
                original_name: true,
                mime_type: true,
            },
        });
    }

    public async deleteMessages(
        ids: number[],
        userId: number,
        forEveryone: ModalButtonAnswers,
    ) {
        const isForEveryone =
            Number(ModalButtonAnswers.DELETE_EVERYONE) === Number(forEveryone);

        const messagesDeleteFor = await this.getMessagesProperties(ids, {
            id: true,
            delete_for: true,
        });

        if (messagesDeleteFor.length === 0) return;

        ///// третий
        const updatedMessages = messagesDeleteFor.map((msg) => ({
            id: msg.id,
            delete_for: isForEveryone
                ? [ModalButtonAnswers.DELETE_EVERYONE]
                : Array.from(new Set([...msg.delete_for, Number(userId)])),
        }));

        await Promise.all(
            updatedMessages.map((msg) =>
                this.prisma.message.update({
                    where: { id: msg.id },
                    data: {
                        read_at: new Date(),
                        deleted_at: new Date(),
                        delete_for: msg.delete_for,
                    },
                }),
            ),
        );
    }

    public async getMessagesProperties<T extends keyof Prisma.MessageSelect>(
        message_ids: string[] | number[],
        select: Record<T, boolean>,
    ) {
        return this.prisma.message.findMany({
            where: { id: { in: message_ids.map(Number) } },
            select,
        });
    }

    public async getMessagesPropertiesByChatId<
        T extends keyof Prisma.MessageSelect,
    >(message_ids: string[] | number[], select: Record<T, boolean>) {
        return this.prisma.message.findMany({
            where: { chat_id: { in: message_ids.map(Number) } },
            select,
        });
    }

    public async getChatIdsByUuid(uuid: string) {
        return await this.prisma.message.findMany({
            where: {
                file_ids: {
                    has: uuid,
                },
            },
        });
    }

    public async getUnreadMessages(chatId: number, recipientId: number) {
        const messages = await this.prisma.message.findMany({
            where: {
                chat_id: Number(chatId),
                read_at: null,
                sender_id: Number(recipientId),
            },
        });

        return messages.length;
    }
}
