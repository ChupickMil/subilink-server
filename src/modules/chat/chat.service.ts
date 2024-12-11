import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UserService } from '../user/user.service'

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

    public async createChat(userId: string, recipientId: string) {
        await this.prisma.chat.create({
            data: {
                first_user: Number(userId),
                second_user: Number(recipientId),
            },
        });
    }

    public async getChats(userId: string) {
        const chats = await this.prisma.chat.findMany({
            where: {
                OR: [
                    { first_user: Number(userId) },
                    { second_user: Number(userId) },
                ],
            },
            select: {
                id: false,
                created_at: false,
                first_user: true,
                second_user: true,
                Message: {
                    orderBy: {
                        created_at: 'desc', // Последние сообщения сверху
                    },
                    take: 1, // Берем только одно сообщение
                    select: {
                        sender_id: true,
                        content: true,
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
        const filteredChats = chats.map((chat) => ({
            lastMessage: chat.Message[0]?.content ?? "",
            sender_id: chat.Message[0]?.sender_id ?? "",
            user:
                chat.first_user === Number(userId)
                    ? chat.second_user === Number(userId)
                        ? undefined
                        : chat.user_second
                    : chat.user,
        }));

        return filteredChats
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
        return chat?.id;
    }

    public async getChatInfo(chatId: string) {
        // id собеседника
        const user = await this.userService.publicUser(chatId, 'id');
        return user;
    }
}
