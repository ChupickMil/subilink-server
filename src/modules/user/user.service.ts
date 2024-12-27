import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateUserDto } from './dto'
import { CreateUserDto } from './dto/createUser.dto'

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

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

    async findUser(value: number | string, type: 'email' | 'phone' | 'id') {
        return await this.prisma.user.findFirst({
            where: {
                [type]: value,
            },
        });
    }

    async publicUser(
        value: number | string,
        type: 'email' | 'phone' | 'id',
        isPhone?: boolean,
        isLastVisit?: boolean,
    ) {
        const selectFields = {
            id: true,
            name: true,
            ...(isPhone ? { phone: true } : {}),
            ...(isLastVisit ? { last_visit: true } : {}),
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
        });
        return !!user?.name;
    }

    async updateUser(user: UpdateUserDto) {
        const userDB = await this.prisma.user.findUnique({
            where: {
                phone: user.phone,
            },
        });

        const updatedUser = {
            ...userDB,
            name: user.name ?? '',
        };

        return !!(await this.prisma.user.update({
            where: {
                phone: user.phone,
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
                    {
                        followedFriends: {
                            none: {
                                follower_id: Number(userId),
                                status: 'confirmed',
                            },
                        },
                    },
                    {
                        followerFriends: {
                            none: {
                                followed_id: Number(userId),
                                status: 'confirmed',
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
            },
        });

        return await this.searchUsers(users, search);;
    }

    private async searchUsers(users: { id: number }[], search: string) {
        if (!search) {
            return await Promise.all(
                users.map(
                    async (user) => await this.publicUser(user.id, 'id', false),
                ),
            );
        }

        return await Promise.all(
            users.map(async (user) => {
                const publicUser = await this.publicUser(user.id, 'id', false);
                console.log(publicUser)
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
}
