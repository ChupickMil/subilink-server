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
import { ClientKafka } from '@nestjs/microservices/client/client-kafka'
import { ApiResponse } from '@nestjs/swagger'
import { firstValueFrom } from 'rxjs'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { KafkaService } from '../kafka/kafka.service'
import { FriendsDto } from './dto/FriendsDto'

@Controller('friends')
export class FriendController {
    private friendClient: ClientKafka;

    constructor(private readonly kafkaService: KafkaService) {
        this.friendClient = this.kafkaService.getFriendClient();
    }

    @ApiResponse({ status: 200, type: FriendsDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('friend')
    async getFriends(@Req() req, @Query() query) {
        const userId = req.session.passport.user;
        const search = query.search;
        return await firstValueFrom(
            this.friendClient.send('get.friends', { userId, search }),
        );
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
    async deleteFriend(@Req() req, @Query() query: { friendId: string }) {
        const userId = req.session.passport.user;
        const friendId = query.friendId;

        return await firstValueFrom(
            this.friendClient.send('delete.friend', { userId, friendId }),
        );
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('friends-requests')
    async getRequests(@Req() req) {
        const userId = req.session.passport.user;
        return await firstValueFrom(
            this.friendClient.send('get.friends.requests', {
                userId,
                type: 'incoming',
            }),
        );
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('outgoing-requests')
    async getOutgoingRequests(@Req() req) {
        const userId = req.session.passport.user;
        return await firstValueFrom(
            this.friendClient.send('get.outgoing.requests', {
                userId,
                type: 'outgoing',
            }),
        );
    }
}
