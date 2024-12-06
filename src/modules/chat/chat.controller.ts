import { Controller, Get, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { FriendsDto } from '../friend/dto/FriendsDto'
import { ChatService } from './chat.service'

@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}
	
    @ApiResponse({ status: 201, type: FriendsDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-users')
    async getFriends(@Req() req) {
		const userId = req.session.passport.user;
        return await this.chatService.getUsersList(userId);
    }
}
