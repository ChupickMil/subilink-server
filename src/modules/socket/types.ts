interface IChatMessageDto {
    userId: string;
    recipientId: string;
    content: string;
    time: string;
    fileUuids: string[];
    replyMessageId: string;
}

interface IFriendsRequestDto {
    userId: number;
    friendId: number; // ID друга, которому отправляется запрос
}

interface IMessagesReadDto {
    message_id: string;
    chat_id: string;
    user_id: string;
    friend_id: string;
    read_at: string;
}

export type { IChatMessageDto, IFriendsRequestDto, IMessagesReadDto }

