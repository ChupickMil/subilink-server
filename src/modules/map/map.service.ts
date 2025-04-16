import { Injectable } from '@nestjs/common'
import { RedisService } from '../redis/redis.service'

@Injectable()
export class MapService {
	constructor(private readonly redis: RedisService){}

	async saveGeolocation(userId: number, lngLat: [number, number]) {
		await this.redis.setGeo(userId, lngLat)
	}
}
