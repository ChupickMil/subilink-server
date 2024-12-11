import { Controller, Get, HttpCode, HttpStatus, Query, Req, UseGuards } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { FriendsDto } from '../friend/dto/FriendsDto'
import { MessageService } from './message.service'

@Controller('message')
export class MessageController {
    constructor(private readonly messagesService: MessageService) {}

	@ApiResponse({ status: 201, type: FriendsDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-messages')
	async getMessages(@Req() req, @Query() query) {
		const userId = req.session.passport.user;
		const senderId = query.senderId
		return await this.messagesService.getMessages(userId, senderId);
	}

	@ApiResponse({ status: 201, type: FriendsDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-updated-last-message')
	async getUpdatedLastMessage(@Req() req, @Query() query) {
		const userId = req.session.passport.user;
		const senderId = query.senderId
		return await this.messagesService.getUpdatedLastMessage(userId, senderId);
	}
}
