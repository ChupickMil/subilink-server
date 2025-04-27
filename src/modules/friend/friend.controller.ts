import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    Req,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { TrackVisitInterceptor } from 'src/interceptors/TrackVisitInterceptor'
import { FriendsDto } from './dto/FriendsDto'
import { FriendService } from './friend.service'

@Controller('friends')
export class FriendController {
    constructor(private readonly friendService: FriendService) {}

    @ApiResponse({ status: 200, type: FriendsDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(TrackVisitInterceptor)
    @Get('friend')
    async getFriends(@Req() req, @Query() query) {
        const userId = req.session.passport.user;
        const search = query.search;

        return await this.friendService.getFriends(userId, search);
    }

    @ApiResponse({ status: 200, type: FriendsDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('profile-friend')
    async getProfileFriends(@Req() req, @Query() query: { id: string | null }) {
        const userId = req.session.passport.user;
        const profileId = query.id === 'null' ? userId : query.id;

        return await this.friendService.getFriends(profileId, '');
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Delete('delete')
    async deleteFriend(@Req() req, @Query() query: { friendId: string }) {
        const userId = req.session.passport.user;
        const friendId = query.friendId;

        return await this.friendService.deleteFriend(userId, friendId);
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('friends-requests')
    async getRequests(@Req() req) {
        const userId = req.session.passport.user;

        return await this.friendService.getIncomingRequests(userId);
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('outgoing-requests')
    async getOutgoingRequests(@Req() req) {
        const userId = req.session.passport.user;

        return await this.friendService.getOutgoingRequests(userId);
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('positions')
    async getPositions(@Req() req) {
        const userId = req.session.passport.user;

        return await this.friendService.getPositions(userId);
    }
}
