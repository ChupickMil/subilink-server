import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
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
    async getFriends(@Req() req) {
		const userId = req.session.passport.user;
        return await this.friendService.getFriends(userId);
    }

	@ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Post('add-friend')
    async addFriend(@Req() req, @Body() body: {friendId: string}) {
		const userId = req.session.passport.user;
        return await this.friendService.addFriend(userId, body.friendId);
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('get-requests')
    async getRequests(@Req() req) {
		const userId = req.session.passport.user;
        return await this.friendService.getRequests(userId);
    }
}
