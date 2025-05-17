import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ModalButtonAnswers } from 'src/common/@types/types'
import { PrismaService } from 'src/modules/prisma/prisma.service'
import { MessageService } from '../message/message.service'
import { UserService } from '../user/user.service'
import { IChats, IFilteredChat } from './types'

@Injectable()
export class ChatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        @Inject(forwardRef(() => MessageService))
        private readonly messageService: MessageService,
    ) {}

    public async getChat(userId: string, recipientId: string) {
        return await this.prisma.chat.findFirst({
            where: {
                OR: [
                    {
                        first_user: Number(userId),
                        second_user: Number(recipientId),
                    },
                    {
                        first_user: Number(recipientId),
                        second_user: Number(userId),
                    },
                ],
            },
        });
    }

    public async getIsHasChat(userId: string, recipientId: string) {
        return !!(await this.getChat(userId, recipientId));
    }

    public async getIsDeletedChat(userId: string, recipientId: string) {
        const data = await this.prisma.chat.findFirst({
            where: {
                OR: [
                    {
                        first_user: Number(userId),
                        second_user: Number(recipientId),
                    },
                    {
                        first_user: Number(recipientId),
                        second_user: Number(userId),
                    },
                ],
            },
            select: {
                delete_for: true,
            },
        });

        if (!data) return false;

        return data.delete_for.length;
    }

    public async recoveryChat(userId: string, recipientId: string) {
        await this.prisma.chat.updateMany({
            where: {
                OR: [
                    {
                        first_user: Number(userId),
                        second_user: Number(recipientId),
                    },
                    {
                        first_user: Number(recipientId),
                        second_user: Number(userId),
                    },
                ],
            },
            data: {
                delete_for: [],
            },
        });
    }

    public async createChat(userId: string, recipientId: string) {
        const chat = await this.prisma.chat.create({
            data: {
                first_user: Number(userId),
                second_user: Number(recipientId),
            },
        });
        return !!chat;
    }

    public async getChats(userId: string, search?: string) {
        try {
            if (!userId) {
                console.error('getChats: userId is required');
                return [];
            }

            const notDeletedChatIds = await this.isDeletedChats(userId);

            if (
                !Array.isArray(notDeletedChatIds) ||
                !notDeletedChatIds.length
            ) {
                return [];
            }

            const chats = await Promise.allSettled(
                notDeletedChatIds.map(async ({ id: chatId }) => {
                    if (!chatId) {
                        console.error('Invalid chatId in notDeletedChatIds');
                        return null;
                    }

                    try {
                        const chat = await this.prisma.chat.findFirst({
                            where: {
                                id: Number(chatId),
                            },
                            select: {
                                id: false,
                                first_user: true,
                                second_user: true,
                            },
                        });

                        if (!chat) {
                            console.error(`Chat not found for id: ${chatId}`);
                            return null;
                        }

                        const [message, first_user, second_user] =
                            await Promise.all([
                                await this.messageService.getMessageForChats([
                                    chat.first_user,
                                    chat.second_user
                                ], chatId),

                                await this.userService.getUserWithSelect(
                                    chat.first_user,
                                    {
                                        id: true,
                                        name: true,
                                        avatar_uuid: true,
                                    },
                                ),

                                await this.userService.getUserWithSelect(
                                    chat.second_user,
                                    {
                                        id: true,
                                        name: true,
                                        avatar_uuid: true,
                                    },
                                ),
                            ]);

                        if (!first_user || !second_user) {
                            console.error(
                                `Missing user data for chat ${chatId}`,
                            );
                            return null;
                        }

                        return {
                            ...chat,
                            message,
                            first_user,
                            second_user,
                        };
                    } catch (err) {
                        console.error(`Error processing chat ${chatId}:`, err);
                        return null;
                    }
                }),
            );

            const successfulChats: IChats[] = chats
                .filter(
                    (result): result is PromiseFulfilledResult<IChats> =>
                        result.status === 'fulfilled' && result.value !== null,
                )
                .map((result) => result.value);

            const filteredChats = await this.getFilteredChats(
                successfulChats,
                userId,
            );

            const validChats = filteredChats.filter((chat) => chat !== null);

            if (!filteredChats) {
                console.warn('No filtered chats found');
                return [];
            }

            if (search) {
                return await this.getSearchedChats(validChats, search);
            }

            return filteredChats;
        } catch (error) {
            console.error('Error in getChats:', error);
            return [];
        }
    }

    private async getFilteredChats(chats: IChats[], userId: string) {
        try {
            if (!Array.isArray(chats) || !userId) {
                console.warn('Invalid input to getFilteredChats');
                return [];
            }

            const filteredChats = await Promise.all(
                chats.map(async (chat) => {
                    try {
                        if (!chat || !chat.first_user || !chat.second_user) {
                            console.warn('Invalid chat object structure');
                            return null;
                        }

                        const message = Array.isArray(chat.message)
                            ? chat.message[0]
                            : null;

                        const lastMessage = message?.content ?? '';
                        const sender_id = message?.sender_id ?? '';
                        const lastMessageTime = message?.created_at
                            ? new Date(message.created_at).toLocaleTimeString()
                            : '';
                        const read_at = message?.read_at ?? null;
                        const fileUuidsLength = message?.file_ids?.length ?? 0;

                        const countUnreadMessages = await (async () => {
                            try {
                                return Number(chat.first_user.id) ===
                                    Number(userId)
                                    ? await this.getCountUnreadMessages(
                                          chat.first_user.id,
                                          chat.second_user.id,
                                      )
                                    : await this.getCountUnreadMessages(
                                          chat.second_user.id,
                                          chat.first_user.id,
                                      );
                            } catch (err) {
                                console.error(
                                    'Error getting unread messages count:',
                                    err,
                                );
                                return 0;
                            }
                        })();

                        const user =
                            Number(chat.first_user.id) === Number(userId)
                                ? Number(chat.second_user.id) === Number(userId)
                                    ? undefined
                                    : chat.second_user
                                : chat.first_user;

                        return {
                            lastMessage,
                            sender_id,
                            lastMessageTime,
                            read_at,
                            fileUuidsLength,
                            countUnreadMessages,
                            user,
                        };
                    } catch (err) {
                        console.error('Error processing individual chat:', err);
                        return null;
                    }
                }),
            );

            return filteredChats.filter(Boolean);
        } catch (error) {
            console.error('Error in getFilteredChats:', error);
            return [];
        }
    }

    public async isDeletedChats(
        userId: string | number,
        chatId?: string | number,
    ) {
        const firstParams =
            userId && !chatId
                ? {
                      OR: [
                          { first_user: Number(userId) },
                          { second_user: Number(userId) },
                      ],
                  }
                : {
                      id: Number(chatId),
                  };

        return await this.prisma.chat.findMany({
            where: {
                ...firstParams,
                AND: [
                    {
                        OR: [
                            {
                                delete_for: {
                                    equals: null,
                                },
                            },
                            {
                                AND: [
                                    {
                                        NOT: {
                                            delete_for: { has: Number(userId) },
                                        },
                                    },
                                    {
                                        NOT: {
                                            delete_for: {
                                                has: ModalButtonAnswers.DELETE_EVERYONE,
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
            },
        });
    }

    private async getSearchedChats(
        filteredChats: IFilteredChat[],
        search: string,
    ) {
        return await Promise.all(
            filteredChats.map(async (chat) => {
                if (
                    chat.user?.name &&
                    chat.user.name.toLowerCase().includes(search.toLowerCase())
                ) {
                    return chat;
                }
                return null;
            }),
        ).then((chats) => chats.filter((chat) => chat !== null));
    }

    public async getChatId(userId: string, recipientId: string) {
        const chat = await this.prisma.chat.findFirst({
            where: {
                OR: [
                    {
                        first_user: Number(userId),
                        second_user: Number(recipientId),
                    },
                    {
                        first_user: Number(recipientId),
                        second_user: Number(userId),
                    },
                ],
            },
            select: {
                id: true,
            },
        });

        if (!chat) return false;

        return chat.id;
    }

    public async getChatInfo(recipientId: string) {
        // id собеседника
        const user = await this.userService.publicUser(
            recipientId,
            'id',
            false,
            false,
            true,
            true,
        );

        return user;
    }

    public async getCountUnreadMessages(userId: number, recipientId: number) {
        const res = await this.prisma.chat.findFirst({
            where: {
                OR: [
                    {
                        first_user: Number(userId),
                        second_user: Number(recipientId),
                    },
                    {
                        first_user: Number(recipientId),
                        second_user: Number(userId),
                    },
                ],
            },
            select: {
                id: true,
            },
        });

        if (!res) return 0;

        const unreadMessagesLength =
            await this.messageService.getUnreadMessages(res.id, recipientId);

        return unreadMessagesLength;
    }

    public async deleteChats(
        ids: string[],
        userId: string,
        forEveryone: ModalButtonAnswers,
    ) {
        const isForEveryone =
            Number(ModalButtonAnswers.DELETE_EVERYONE) === Number(forEveryone);

        const chatIds = (
            await Promise.all(
                ids.map((chatId) => this.getChatId(userId, chatId)),
            )
        )
            .filter(Boolean)
            .map(Number);

        if (chatIds.length === 0) return;

        const chatsDeleteFor = await this.getChatProperties(chatIds, {
            delete_for: true,
        });

        const messagesDeleteFor =
            await this.messageService.getMessagesPropertiesByChatId(chatIds, {
                id: true,
                delete_for: true,
            });

        await Promise.all(
            chatsDeleteFor.map(async (chat, i) => {
                await this.prisma.chat.update({
                    where: { id: chatIds[i] },
                    data: {
                        deleted_at: new Date(),
                        delete_for: chat.delete_for.includes(0)
                            ? [0]
                            : isForEveryone
                              ? [ModalButtonAnswers.DELETE_EVERYONE]
                              : chat.delete_for.includes(Number(userId))
                                ? chat.delete_for
                                : [...chat.delete_for, Number(userId)],
                    },
                });
            }),
        );

        const messageIds = messagesDeleteFor.map((msg) => msg.id);

        if (messageIds.length === 0) return;

        await this.messageService.deleteMessages(
            messageIds,
            Number(userId),
            forEveryone,
        );

        return true;
    }

    private async getChatProperties<T extends keyof Prisma.ChatSelect>(
        ids: number[],
        select: Record<T, boolean>,
    ) {
        return this.prisma.chat.findMany({
            where: { id: { in: ids } },
            select,
        });
    }

    public async checkUserChatAccess(chatId: number, userId: number) {
        return await this.prisma.chat.findFirst({
            where: {
                id: Number(chatId),
                OR: [
                    { first_user: Number(userId) },
                    { second_user: Number(userId) },
                ],
            },
        });
    }
}
