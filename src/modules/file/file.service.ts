import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/modules/prisma/prisma.service'

@Injectable()
export class FileService {
    constructor(private readonly prisma: PrismaService) {}

    async getFileByUuid(uuid: string) {
        return await this.prisma.file.findFirst({
            where: {
                uuid,
            },
        });
    }

    async getFileByUuids(uuids: string[], take: string) {
        return await this.prisma.file.findMany({
            where: {
                uuid: {
                    in: uuids,
                },
            },
            take: Number(take),
        });
    }

    async getProfileFilesByUserId(userId: number, lastId: number) {
        const paramQuery =
            lastId != null && !isNaN(Number(lastId))
                ? { id: { lt: Number(lastId) } }
                : {};

        return await this.prisma.file.findMany({
            where: {
                user_id: Number(userId),
                is_in_profile: true,
                ...paramQuery,
            },
            orderBy: { id: 'desc' },
            take: 10,
        });
    }

    async getFiles(ids: string[]) {
        return await this.prisma.file.findMany({
            where: {
                id: {
                    in: ids.map(Number),
                },
            },
        });
    }

    async getFileByUuidSelect<T extends Prisma.FileSelect>(
        uuid: string,
        userId?: number,
        select?: T,
    ) {
        if (select) {
            return await this.prisma.file.findFirst({
                where: {
                    uuid,
                },
                select: {
                    ...select,
                },
            });
        }

        return await this.prisma.file.findFirst({
            where: {
                uuid,
            },
        });
    }

    public async createFile(
        uuid: string,
        path: string,
        type: string,
        size: number,
        mime_type: string,
        original_name: string,
        user_id: number,
        is_in_profile?: boolean,
    ) {
        await this.prisma.file.create({
            data: {
                uuid,
                path,
                type,
                size: Number(size),
                mime_type,
                original_name,
                user_id: Number(user_id),
                is_in_profile,
            },
        });
    }

    async doesUserHaveFile(userId: string, uuid: string) {
        return !!(await this.prisma.file.findFirst({
            where: {
                user_id: Number(userId),
                uuid,
            },
        }));
    }

    async deleteFile(userId: string, uuid: string) {
        return await this.prisma.file.delete({
            where: {
                user_id: Number(userId),
                uuid,
            },
        });
    }
}
