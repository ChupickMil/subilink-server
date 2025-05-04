import { Injectable } from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import { PrismaService } from 'src/modules/prisma/prisma.service'
import { RedisService } from 'src/modules/redis/redis.service'
import { FileService } from '../file/file.service'
import { FriendService } from './../friend/friend.service'
import { CreateUserDto } from './dto'
import { IFile } from './types'

@Injectable()
export class UserService {
    constructor(
        private readonly redis: RedisService,
        private readonly prisma: PrismaService,
        private readonly fileService: FileService,
        private readonly friendService: FriendService,
    ) {}

    async createUser(user: CreateUserDto): Promise<CreateUserDto> {
        try {
            const newUser = await this.prisma.user.create({
                data: {
                    phone: user.phone,
                    name: user.name,
                },
            });

            return newUser;
        } catch (err) {
            throw new Error(err);
        }
    }

    public async findUserSelect<T extends Prisma.UserSelect>(
        value: string,
        type: 'email' | 'phone' | 'id',
        select: T,
    ): Promise<Prisma.UserGetPayload<{ select: T }> | null> {
        return this.prisma.user.findFirst({
            where: { [type]: value },
            select,
        });
    }

    async findUser(value: string | number, type: 'email' | 'phone' | 'id') {
        if (!value) return null;

        return await this.prisma.user.findFirst({
            where: {
                [type]: value,
            },
        });
    }

    async newViews(userId: number, profileId: number) {
        const view = await this.prisma.view.findFirst({
            where: {
                user_id: Number(profileId),
                guest_id: Number(userId),
            },
            orderBy: {
                id: 'desc',
            },
        });

        const viewTime = view ? view.createdAt.getDate() : 0;
        const today = new Date().getDate();

        if (viewTime !== today) {
            await this.prisma.view.create({
                data: {
                    user_id: Number(profileId),
                    guest_id: Number(userId),
                },
            });
        }
    }

    async publicUser(
        value: string | number,
        type: 'email' | 'phone' | 'id',
        isPhone?: boolean,
        isDescription?: boolean,
        isAvatar?: boolean,
        isLastVisit?: boolean,
    ) {
        const selectFields = {
            id: true,
            name: true,
            ...(isPhone ? { phone: true } : {}),
            ...(isDescription ? { description: true } : {}),
            ...(isLastVisit ? { last_visit: true } : {}),
            ...(isAvatar ? { avatar_uuid: true } : {}),
        };

        return await this.prisma.user.findFirst({
            where: {
                [type]: type === 'id' ? Number(value) : value,
            },
            select: selectFields,
        });
    }

    async getName(phone: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                phone,
            },
            select: {
                name: true,
            },
        });

        return user?.name;
    }

    async updateAvatarByUuid(userId: string, uuid: string) {
        await this.prisma.user.update({
            where: {
                id: Number(userId),
            },
            data: {
                avatar_uuid: uuid,
            },
        });

        return true;
    }

    async deleteFileById(userId: string, uuid: string) {
        return await this.fileService.deleteFile(userId, uuid);
    }

    async updateUser(
        userId: string,
        data: { name?: string; description?: string },
    ) {
        const userDB = await this.prisma.user.findUnique({
            where: {
                id: Number(userId),
            },
        });

        const updatedUser = {
            ...userDB,
            ...(data.name !== undefined && { name: data.name ?? '' }),
            ...(data.description !== undefined && {
                description: data.description ?? '',
            }),
        };

        return !!(await this.prisma.user.update({
            where: {
                id: Number(userId),
            },
            data: updatedUser,
        }));
    }

    async getGlobalUsers(userId: string, search: string) {
        const users = await this.prisma.user.findMany({
            where: {
                AND: [
                    {
                        NOT: {
                            id: Number(userId),
                        },
                    },
                    // пусть друзья тоже будут в глобальном списке поиска
                    // {
                    //     followedFriends: {
                    //         none: {
                    //             follower_id: Number(userId),
                    //             status: 'confirmed',
                    //         },
                    //     },
                    // },
                    // {
                    //     followerFriends: {
                    //         none: {
                    //             followed_id: Number(userId),
                    //             status: 'confirmed',
                    //         },
                    //     },
                    // },
                ],
            },
            select: {
                id: true,
            },
        });

        return await this.searchUsers(users, search);
    }

    private async searchUsers(users: { id: number }[], search: string) {
        if (!search) {
            return await Promise.all(
                users.map(
                    async (user) =>
                        await this.publicUser(user.id, 'id', false, true, true),
                ),
            );
        }

        return await Promise.all(
            users.map(async (user) => {
                const publicUser = await this.publicUser(
                    user.id,
                    'id',
                    false,
                    true,
                    true,
                );
                if (
                    publicUser?.name &&
                    publicUser.name.toLowerCase().includes(search.toLowerCase())
                ) {
                    return publicUser;
                }
                return null;
            }),
        ).then((users) => users.filter((user) => user !== null));
    }

    public async getProfileUser(userId: number) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: Number(userId),
            },
            select: {
                id: true,
                name: true,
                avatar_uuid: true,
                views: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        return {
            ...user,
            views: user?.views.length,
        };
    }

    public async getPosition(userId: number) {
        return await this.redis.getGeo(userId);
    }

    public async getUser(userId: number) {
        return await this.prisma.user.findFirst({
            where: {
                id: Number(userId),
            },
        });
    }

    public async getUserWithSelect<T extends Record<string, boolean>>(
        userId: number,
        select: T,
    ): Promise<Partial<User> | null> {
        return await this.prisma.user.findFirst({
            where: {
                id: Number(userId),
            },
            select: select,
        });
    }

    public async getUsers(userIds: number[]) {
        return await this.prisma.user.findMany({
            where: {
                id: {
                    in: userIds.map(Number),
                },
            },
        });
    }

    public async getUsersSelect<T extends Record<string, boolean>>(
        userIds: number[],
        select: T,
    ) {
        return await this.prisma.user.findMany({
            where: {
                id: {
                    in: userIds.map(Number),
                },
            },
            select: {
                ...select,
            },
        });
    }

    public async updateLastVisit(userId: string) {
        await this.prisma.user.update({
            where: {
                id: Number(userId),
            },
            data: {
                last_visit: new Date(),
            },
        });
    }

    async saveAvatar(file: {
        uuid: string;
        path: string;
        type: string;
        size: number;
        mime_type: string;
        original_name: string;
        user_id: number;
    }) {
        try {
            await this.prisma.user.update({
                where: {
                    id: Number(file.user_id),
                },
                data: {
                    avatar_uuid: file.uuid,
                },
            });

            await this.fileService.createFile(
                file.uuid,
                file.path,
                file.type,
                Number(file.size),
                file.mime_type,
                file.original_name,
                Number(file.user_id),
            );
        } catch (err) {
            console.log(err);
        }
    }

    async getImageByUuid(uuid: string, userId: number) {
        return await this.fileService.getFileByUuidSelect(uuid, userId, {
            id: true,
            path: true,
            original_name: true,
            mime_type: true,
        });
    }

    async getAvatar(userId: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: Number(userId),
            },
            select: {
                avatar_uuid: true,
            },
        });

        if (!user) return;

        const img = await this.fileService.getFileByUuidSelect(
            user.avatar_uuid,
            Number(userId),
            {
                id: true,
                path: true,
                original_name: true,
                mime_type: true,
            },
        );

        return img ?? {};
    }

    async addProfilePhotos(file: IFile) {
        try {
            await this.fileService.createFile(
                file.uuid,
                file.path,
                file.type,
                Number(file.size),
                file.mime_type,
                file.original_name,
                Number(file.user_id),
                true,
            );
        } catch (err) {
            console.log(err);
        }

        return true;
    }

    async getProfilePhoto(uuid: string, userId: string) {
        const doesUserHavePhoto = await this.fileService.doesUserHaveFile(
            userId,
            uuid,
        );

        if (!doesUserHavePhoto) {
            return new Error('Access denied');
        }

        return await this.fileService.getFileByUuidSelect(
            uuid,
            Number(userId),
            {
                id: true,
                path: true,
                original_name: true,
                mime_type: true,
            },
        );
    }

    async getProfileFilesByUserId(userId: number, lastId: number) {
        return await this.fileService.getProfileFilesByUserId(userId, lastId);
    }

    async getIsFriends(userId: number, friendId: number) {
        return await this.friendService.getIsFriends(userId, friendId);
    }

    async getShakes(userId: number) {
        return await this.prisma.shake.count({
            where: {
                OR: [
                    {
                        first_user: userId,
                    },
                    {
                        second_user: userId,
                    },
                ],
            },
        });
    }
}
