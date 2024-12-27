import { Controller, Get, HttpCode, HttpStatus, Query, Req, UseGuards } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { ChatService } from './chat.service'

@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}
	
    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-chats')
    async getFriends(@Req() req, @Query() query: { search: string }) {
		const userId = req.session.passport.user;
        const search = query.search
        return await this.chatService.getChats(userId, search);
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-chat-info')
    async getChatInfo(@Req() req, @Query() query: {chatId: string}) {
		const chatId = query.chatId;
        return await this.chatService.getChatInfo(chatId);
    }
}
