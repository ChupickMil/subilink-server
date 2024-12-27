import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Query,
    Req,
    UseGuards
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { FriendsDto } from './dto/FriendsDto'
import { FriendService } from './friend.service'

@Controller('friend')
export class FriendController {
    constructor(private readonly friendService: FriendService) {}
	
    @ApiResponse({ status: 201, type: FriendsDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-friends')
    async getFriends(@Req() req, @Query() query) {
		const userId = req.session.passport.user;
        const search = query.search;
        return await this.friendService.getFriends(userId, search);
    }

	// @ApiResponse({ status: 200 })
    // @UseGuards(AuthenticatedGuard, TwoFAGuard)
    // @HttpCode(HttpStatus.OK)
    // @Post('add-friend')
    // async addFriend(@Req() req, @Body() body: {friendId: string}) {
	// 	const userId = req.session.passport.user;
    //     return await this.friendService.addFriend(userId, body.friendId);
    // }
    
	@ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Delete('delete')
    async addFriend(@Req() req, @Query() query: {friendId: string}) {
		const userId = req.session.passport.user;
        const friendId = query.friendId;
        return await this.friendService.deleteFriend(userId, friendId);
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-friends-requests')
    async getRequests(@Req() req) {
		const userId = req.session.passport.user;
        return await this.friendService.getRequests(userId, 'incoming');
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-outgoing-requests')
    async getOutgoingRequests(@Req() req) {
		const userId = req.session.passport.user;
        return await this.friendService.getRequests(userId, 'outgoing');
    }
}
