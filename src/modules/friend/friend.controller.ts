import {
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Query,
	UseGuards,
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
    async getFriends(@Query() query: { id: string }) {
        return await this.friendService.getFriends(query.id);
    }

	@ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('add-friend')
    async addFriend(@Query() {userId, friendId}: { userId: string, friendId: string }) {
        return await this.friendService.addFriend(userId, friendId);
    }
}
