import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

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
            take: 7,
            select: {
                id: true,
                session_id: true,
                is_active: true,
                user_agent: true,
                ip_address: true,
                created_at: true,
            },
        });

        const data = visits.map((item) => {
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

        for (let i = 0; i < sortedDates.length - 1; i++) {
            const currDay = sortedDates[i].day
            const nextDay = sortedDates[i + 1].day

            if (currDay !== nextDay) {
                filteredVisits.push(sortedDates[i]);
            }
            if(sortedDates.length === i + 2 && currDay !== nextDay){
                filteredVisits.push(sortedDates[i + 1]);
            }
        }

        return filteredVisits
    }

    public async newVisit(
        id: number,
        sessionId: string,
        ip: string | undefined,
        userAgent: string | undefined,
    ) {
        await this.prisma.visit.create({
            data: {
                user_id: id,
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

        await this.prisma.visit.update({
            where: {
                id: res.id,
            },
            data: {
                is_active: false,
            },
        });

        await this.redisService.del(`sess:${res.session_id}`);
    }
}
