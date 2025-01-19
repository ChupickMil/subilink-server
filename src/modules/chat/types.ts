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

interface IChat {
    first_user: number;
    second_user: number;
    Message: {
        created_at: Date;
        sender_id: number;
        read_at: Date | null;
        content: string | null;
        img_uuids: string[];
    }[];
    user: {
        id: number;
        name: string | null;
    };
    user_second: {
        id: number;
        name: string | null;
    };
}

export type { IChat, IFilteredChat }

