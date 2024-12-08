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
        console.log(value);

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
        isLastVisit?: boolean
    ) {
        const selectFields = {
            id: true,
            name: true,
            ...(isPhone ? { phone: true } : {}),
            ...(isLastVisit ? { lastVisit: true } : {}),
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

    async getGlobalUsers(userId: string) {
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
                name: true,
            },
        });

        return users;
    }
}
