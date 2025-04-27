import { Prisma } from '@prisma/client'

interface IFilteredChat {
    lastMessage: string;
    sender_id: string | number;
    lastMessageTime: string;
    read_at: Date | null;
    fileUuidsLength: number;
    countUnreadMessages: number;
    user: {
        id: number;
        name: string;
    } | undefined;
}

type ChatWithRelations = Prisma.ChatGetPayload<{
    select: {
        first_user: true;
        second_user: true;
        Message: {
            orderBy: {
                created_at: 'desc';
            };
            take: 1;
            select: {
                read_at: true;
                sender_id: true;
                content: true;
                created_at: true;
                files: true;
            };
        };
        user: {
            select: {
                id: true;
                name: true;
            };
        };
        user_second: {
            select: {
                id: true;
                name: true;
            };
        };
    };
}>;

interface IChats {
    message: {
        sender_id: number;
        chat_id: number;
        read_at: Date;
        content: string;
        created_at: Date;
        file_ids: string[];
    }[];
    first_user: {
        id: number;
        name: string;
    };
    second_user: {
        id: number;
        name: string;
    };
}

export type { ChatWithRelations, IChats, IFilteredChat }

