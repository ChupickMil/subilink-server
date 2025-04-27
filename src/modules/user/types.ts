interface IFile {
	uuid: string;
	path: string;
	type: string;
	size: number;
	mime_type: string;
	original_name: string;
	user_id: number;
}

export type {
	IFile
}

