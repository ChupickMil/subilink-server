import { Prisma } from '@prisma/client'

interface IFilteredChat {
    lastMessage: string;
    sender_id: number;
    lastMessageTime: string;
    user:
        | {
              id: number;
              name: string | null;
          }
        | undefined;
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

export type { ChatWithRelations, IFilteredChat }

