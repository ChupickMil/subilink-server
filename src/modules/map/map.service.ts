import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

@Injectable()
export class MapService {
	constructor(private readonly redis: RedisService, private readonly prisma: PrismaService){}

	async saveGeolocation(userId: number, lngLat: [number, number]) {
		await this.redis.setGeo(userId, lngLat)
	}

	async shake(userId: number, friendId: number) {
		const lastShake = await this.checkLastShake(userId, friendId)

		if(lastShake && lastShake.created_at){
			const isPassedOneMinute = this.hasOneMinutePassed(lastShake.created_at)

			if(!isPassedOneMinute) return false
		}

		return await this.prisma.shake.create({
			data: {
				first_user: Number(userId),
				second_user: Number(friendId)
			},
			select: {
				first_user: true,
				second_user: true
			}
		})
	}

	async checkLastShake(userId: number, friendId: number) {
		return await this.prisma.shake.findFirst({
			where: {
				OR: [
					{
						first_user: Number(userId),
						second_user: Number(friendId)
					},
					{
						first_user: Number(friendId),
						second_user: Number(userId)
					}
				]
			},
			orderBy: {
				created_at: 'desc'
			}
		})
	}

	hasOneMinutePassed = (createdAt: Date): boolean => {
		if (!createdAt) return false; 
	  
		const now = new Date(); 
		const createdTime = createdAt instanceof Date ? createdAt : new Date(createdAt);
	  
		const timeDifference = now.getTime() - createdTime.getTime(); 
		const oneMinuteInMs = 60 * 1000; 
	  
		return timeDifference >= oneMinuteInMs;
	  };
}
