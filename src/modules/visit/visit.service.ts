import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/modules/prisma/prisma.service'
import { RedisService } from 'src/modules/redis/redis.service'

const VisitsSelect = {
    id: true,
    session_id: true,
    is_active: true,
    user_agent: true,
    ip_address: true,
    created_at: true,
};

type VisitSelectType = Prisma.VisitGetPayload<{
    select: typeof VisitsSelect;
}>;

@Injectable()
export class VisitService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
    ) {}

    public async getVisits(sessionId: string, userId: string) {
        const visits = await this.prisma.visit.findMany({
            where: {
                user_id: Number(userId),
            },
            orderBy: {
                created_at: 'desc',
            },
            take: 10,
            distinct: ['session_id'],
            select: VisitsSelect,
        });

        const uniqueVisits: VisitSelectType[] = [];

        for (let i = 0; i < visits.length; i++) {
            if (i === visits.length - 1) {
                uniqueVisits.push(visits[i]);
                break;
            }

            if (visits[i].session_id === visits[i + 1].session_id) {
                continue;
            }

            uniqueVisits.push(visits[i]);
        }

        const data = uniqueVisits.map((item) => {
            return {
                id: item.id,
                is_active: item.is_active,
                user_agent: item.user_agent,
                created_at: item.created_at,
                ip_address: item.ip_address,
                is_you: String(sessionId) === String(item.session_id),
            };
        });

        return data;
    }

    public async getDateVisits(userId: string) {
        const visits = await this.prisma.visit.findMany({
            where: {
                user_id: Number(userId),
            },
            select: {
                created_at: true,
            },
        });

        const filteredVisits = this.filterDateVisits(visits);

        return filteredVisits;
    }

    private async filterDateVisits(
        visits: {
            created_at: Date;
        }[],
    ) {
        const newDates = visits.map((visit) => ({
            day: visit.created_at.getUTCDate(),
            month: visit.created_at.getUTCMonth(),
            year: visit.created_at.getUTCFullYear(),
        }));

        const sortedDates = newDates.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            return a.day - b.day;
        });

        let filteredVisits = new Array<{
            day: number;
            month: number;
            year: number;
        }>();

        if (sortedDates.length > 0) {
            filteredVisits.push(sortedDates[0]);
        }

        for (let i = 1; i < sortedDates.length; i++) {
            const prev = sortedDates[i - 1];
            const curr = sortedDates[i];

            if (
                curr.day !== prev.day ||
                curr.month !== prev.month ||
                curr.year !== prev.year
            ) {
                filteredVisits.push(curr);
            }
        }

        return filteredVisits;
    }

    public async newVisit(
        id: number,
        sessionId: string,
        ip: string | undefined,
        userAgent: string | undefined,
    ) {
        await this.prisma.visit.create({
            data: {
                user_id: Number(id),
                session_id: sessionId,
                ip_address: ip ?? null,
                user_agent: userAgent,
                is_active: true,
            },
        });
    }

    public async logoutById(id: string, userId: string) {
        const res = await this.prisma.visit.findFirst({
            where: {
                id: Number(id),
                user_id: Number(userId),
            },
        });

        if (!res) return;

        await this.prisma.visit.updateMany({
            where: {
                session_id: res.session_id,
            },
            data: {
                is_active: false,
            },
        });

        await this.redisService.del(`sess:${res.session_id}`);
    }

    public async findVisit(sessionId: string, select: Record<string, boolean>) {
        if (select) {
            return await this.prisma.visit.findFirst({
                where: {
                    session_id: sessionId,
                },
                select: {
                    ...select,
                },
            });
        }

        return await this.prisma.visit.findFirst({
            where: {
                session_id: sessionId,
            },
        });
    }

    public async logout(sessionId: string) {
        return await this.prisma.visit.updateMany({
            where: {
                session_id: sessionId,
            },
            data: {
                is_active: false,
            },
        });
    }
}
