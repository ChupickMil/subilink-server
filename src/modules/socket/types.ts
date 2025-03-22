interface IChatMessageDto {
	userId: string;
	recipientId: string;
	content: string;
	time: string;
	fileUuids: string[],
	replyMessageId: string
}

interface IFriendsRequestDto {
	userId: string;
	friendId: string; // ID друга, которому отправляется запрос
}

export type {
	IChatMessageDto,
	IFriendsRequestDto
}

