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
    UseInterceptors
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import { ModalButtonAnswers } from 'src/common/@types/types'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { TrackVisitInterceptor } from 'src/interceptors/TrackVisitInterceptor'
import { ChatService } from './chat.service'
import { ChatInfoDto } from './dto/ChatInfo.dto'
import { FilteredChatDto } from './dto/FilteredChat.dto'

@Controller('chats')
export class ChatController {
    constructor(
        private readonly chatService: ChatService
    ) {
    }

    @ApiResponse({ status: 200, type: FilteredChatDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @UseInterceptors(TrackVisitInterceptor)
    @HttpCode(HttpStatus.OK)
    @Get('chats')
    async getChats(@Req() req, @Query() query: { search: string }) {
        const userId = req.session.passport.user;
        const search = query.search;

        return await this.chatService.getChats(userId, search)
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

        const recipientId = query.chatId;
        if (!recipientId) return res.status(HttpStatus.BAD_REQUEST);

        const result = await this.chatService.getChatInfo(recipientId)

        res.send(result);
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Delete('chats')
    async deleteMessages(
        @Req() req,
        @Query() query: { ids: string; for_everyone: ModalButtonAnswers },
    ) {
        const userId = req.session.passport.user;
        const ids = query.ids.split(',');
        const for_everyone = query.for_everyone;

        return await this.chatService.deleteChats(ids, userId, for_everyone)
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('count-unread-messages')
    async getCountUnreadMessages(
        @Req() req,
        @Query() query: { chatId: string },
    ) {
        const userId = req.session.passport.user;

        return await this.chatService.getCountUnreadMessages(userId, Number(query.chatId))
    }
}
