import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ModalButtonAnswers } from 'src/common/@types/types'
import { PrismaService } from '../prisma/prisma.service'
import { UserService } from '../user/user.service'
import { ChatWithRelations, IFilteredChat } from './types'

@Injectable()
export class ChatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
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

    public async getChats(userId: string);
    public async getChats(userId: string, search: string);
    public async getChats(
        userId: string,
        search?: string,
    ): Promise<IFilteredChat[]> {
        const notDeletedChatIds = await this.isDeletedChats(userId);

        const chats = await this.prisma.chat.findMany({
            where: {
                id: {
                    in: notDeletedChatIds.map((item) => Number(item.id)),
                },
            },
            select: {
                id: false,
                created_at: false,
                first_user: true,
                second_user: true,
                Message: {
                    where: {
                        OR: [
                            { delete_for: { equals: null } },
                            {
                                NOT: [
                                    {
                                        OR: [
                                            {
                                                delete_for: {
                                                    has: Number(userId),
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
                        created_at: 'desc', // Последние сообщения сверху
                    },
                    take: 1, // Берем только одно сообщение
                    select: {
                        read_at: true,
                        sender_id: true,
                        content: true,
                        created_at: true,
                        files: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                user_second: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Возвращаем чат без самого пользователя
        const filteredChats = await this.getFilteredChats(chats, userId);

        if (search) {
            return await this.getSearchedChats(filteredChats, search);
        }

        return filteredChats;
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

    private async getFilteredChats(chats: ChatWithRelations[], userId: string) {
        return Promise.all(
            chats.map(async (chat) => ({
                lastMessage: chat.Message[0]?.content ?? '',
                sender_id: chat.Message[0]?.sender_id ?? '',
                lastMessageTime:
                    chat.Message[0]?.created_at.toLocaleTimeString(),
                read_at: chat.Message[0]?.read_at ?? null,
                fileUuidsLength: chat.Message[0]?.files.length ?? 0,
                countUnreadMessages:
                    chat.first_user === Number(userId)
                        ? await this.getCountUnreadMessages(
                              chat.first_user,
                              chat.second_user,
                          )
                        : await this.getCountUnreadMessages(
                              chat.second_user,
                              chat.first_user,
                          ),
                user:
                    chat.first_user === Number(userId)
                        ? chat.second_user === Number(userId)
                            ? undefined
                            : chat.user_second
                        : chat.user,
            })),
        );
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
        console.log('recipientId ' + recipientId);
        const user = await this.userService.publicUser(
            recipientId,
            'id',
            false,
            true,
        );
        return user;
    }

    public async getCountUnreadMessages(
        userId: string | number,
        recipientId: string | number,
    ) {
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
                Message: {
                    where: {
                        read_at: null,
                        sender_id: Number(recipientId),
                    },
                },
            },
        });

        if (!res) return 0;

        return res.Message.length;
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

        const messagesDeleteFor = await this.getMessagesProperties(chatIds, {
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

        await Promise.all(
            messagesDeleteFor.map(async (msg) => {
                if (msg.delete_for.includes(ModalButtonAnswers.DELETE_EVERYONE))
                    return;

                await this.prisma.message.update({
                    where: { id: msg.id },
                    data: {
                        deleted_at: new Date(),
                        delete_for: isForEveryone
                            ? [ModalButtonAnswers.DELETE_EVERYONE]
                            : msg.delete_for.includes(Number(userId))
                              ? msg.delete_for
                              : [...msg.delete_for, Number(userId)],
                    },
                });
            }),
        );
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

    private async getMessagesProperties<T extends keyof Prisma.MessageSelect>(
        chatIds: number[],
        select: Record<T, boolean>,
    ) {
        return this.prisma.message.findMany({
            where: { chat_id: { in: chatIds } },
            select,
        });
    }
}
