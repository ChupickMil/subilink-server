import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto';
import { CreateUserDto } from './dto/createUser.dto';

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

    async publicUser() {
        return await this.prisma.user.findFirst({
            select: {
                phone: true,
                email: true,
            },
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
}
