import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { ChatService } from './chat.service'
import { ChatInfoDto } from './dto/ChatInfo.dto'
import { FilteredChatDto } from './dto/FilteredChat.dto'

@Controller('chats')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @ApiResponse({ status: 200, type: FilteredChatDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('chats')
    async getFriends(@Req() req, @Query() query: { search: string }) {
        const userId = req.session.passport.user;
        const search = query.search;

        return await this.chatService.getChats(userId, search);
    }

    @ApiResponse({ status: 200, type: ChatInfoDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('chat-info')
    async getChatInfo(
        @Req() req,
        @Query() query: { chatId: string },
        @Res() res: Response,
    ) {
        const userId = req.session.passport.user;
        if (!userId) return res.status(HttpStatus.UNAUTHORIZED);

        const chatId = query.chatId;
        if (!chatId) return res.status(HttpStatus.BAD_REQUEST);

        res.send(await this.chatService.getChatInfo(chatId));
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Delete('chats')
    async deleteMessages(@Req() req, @Query() query: { ids: string }) {
        const userId = req.session.passport.user;
        const ids = query.ids.split(',');

        return await this.chatService.deleteChats(ids, userId);
    }
}
