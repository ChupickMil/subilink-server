interface IMessage {
	content: string;
	id: number;
	sender_id: number;
	chat_id: number;
	read_at: Date;
	reply_id: number;
	send_at: Date;
	file_ids: string[];
	user?: {}
}

export type {
	IMessage
}

