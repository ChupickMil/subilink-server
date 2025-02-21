export interface IUser {
    email: string | null;
    phone: string;
    id: number;
    name: string | null;
    password: string | null;
    last_visit: Date;
    createAt: Date;
    updateAt: Date;
}
