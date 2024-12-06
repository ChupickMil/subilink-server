import { Module } from '@nestjs/common'
import { FriendModule } from '../friend/friend.module'
import { SocketService } from './socket.service'

@Module({
  imports: [FriendModule],
  providers: [SocketService],
  exports: [SocketService]
})
export class SocketModule {}
