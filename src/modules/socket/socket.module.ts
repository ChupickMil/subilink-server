import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { FriendModule } from '../friend/friend.module'
import { MessageModule } from '../message/message.module'
import { SocketService } from './socket.service'

@Module({
  imports: [FriendModule, ChatModule, MessageModule],
  providers: [SocketService],
  exports: [SocketService]
})
export class SocketModule {}
