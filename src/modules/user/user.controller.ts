import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Inject,
    Patch,
    Query,
    Req,
    Res,
    Session,
    UseGuards,
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

import { ClientKafka } from '@nestjs/microservices'
import { Response } from 'express'
import { firstValueFrom } from 'rxjs'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { UpdateUserDto } from './dto'
import { GlobalUsers } from './dto/globalUser.dto'

@Controller('users')
export class UserController {
    constructor(@Inject("USER_SERVICE") private readonly client: ClientKafka) {
        this.client.subscribeToResponseOf('get.user');
        this.client.subscribeToResponseOf('delete.user');
        this.client.subscribeToResponseOf('get.global.users');
        this.client.subscribeToResponseOf('update.user');
    }

    async onModuleInit() {
        await this.client.connect();
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('user')
    async getUser(@Req() req) {
        const id = req.session.passport.user;

        return this.client.send('get.user', id);
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
            this.client.send('update.user', user),
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
        return this.client.send('get.global.users', { userId, search });
    }
}
