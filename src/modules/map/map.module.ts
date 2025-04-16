import { Module } from '@nestjs/common'
import { RedisModule } from '../redis/redis.module'
import { MapController } from './map.controller'
import { MapService } from './map.service'

@Module({
  imports: [RedisModule],
  controllers: [MapController],
  providers: [MapService],
  exports: [MapService]
})
export class MapModule {}
