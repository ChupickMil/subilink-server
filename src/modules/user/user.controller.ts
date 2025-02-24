import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Patch,
    Query,
    Req,
    Res,
    Session,
    UseGuards
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

import { ClientKafka } from '@nestjs/microservices'
import { Response } from 'express'
import { firstValueFrom } from 'rxjs'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { KafkaService } from '../kafka/kafka.service'
import { UpdateUserDto } from './dto'
import { GlobalUsers } from './dto/globalUser.dto'

@Controller('users')
export class UserController {
    private userClient: ClientKafka

    constructor(private readonly kafkaService: KafkaService) {
        this.userClient = kafkaService.getUserClient()
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('user')
    async getUser(@Req() req) {
        const id = req.session.passport.user;

        return await firstValueFrom(this.userClient.send('get.user', id));
    }

    @ApiResponse({ status: 200, type: UpdateUserDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Patch('name')
    async updateName(
        @Session() session,
        @Body() user: UpdateUserDto,
        @Res() res: Response,
    ) {
        const answer = await firstValueFrom<{ isSuccess: boolean }>(
            this.userClient.send('update.user', user),
        );
        return answer.isSuccess
            ? res.status(HttpStatus.OK).json({ success: true })
            : res.status(HttpStatus.BAD_REQUEST).json({ success: false });
    }

    @ApiResponse({ status: 200, type: GlobalUsers })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('global-users')
    async getGlobalUsers(@Req() req, @Query() query: { search: string }) {
        const userId = req.session.passport.user;
        const search = query.search;
        return this.userClient.send('get.global.users', { userId, search });
    }
}
