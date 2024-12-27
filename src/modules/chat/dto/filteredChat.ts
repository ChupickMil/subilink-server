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

export type {
	IFilteredChat
}
