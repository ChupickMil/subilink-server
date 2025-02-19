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

import { Client, ClientKafka, Transport } from '@nestjs/microservices'
import { Response } from 'express'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { UpdateUserDto } from './dto'
import { GlobalUsers } from './dto/globalUser.dto'
import { UserService } from './user.service'

@Controller('users')
export class UserController {
    @Client({
        transport: Transport.KAFKA,
        options: {
            client: {
                clientId: 'user',
                brokers: ['localhost:9092']
            },
            consumer: {
                groupId: 'user-service',
            }
        }
    })
    client: ClientKafka

    async onModuleInit() {
        this.client.subscribeToResponseOf('get.user');
        this.client.subscribeToResponseOf('create.user');
        this.client.subscribeToResponseOf('delete.user');
        this.client.subscribeToResponseOf('get.global.users');

        await this.client.connect()
    }

    constructor(private readonly userService: UserService) {}

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('user')
    async getUser(@Req() req) {
        const id = req.session.passport.user;

        return this.client.send('get.user', id)

        return await this.userService.publicUser(id, 'id', true);
    }

    @ApiResponse({ status: 200, type: UpdateUserDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Patch('name')
    async updateName(
        @Session() session,
        @Body() user: UpdateUserDto,
        @Res() res: Response,
    ) {
        await this.userService.updateUser(user);
        return res.status(HttpStatus.OK).json({
            success: true,
        });
    }

    @ApiResponse({ status: 200, type: GlobalUsers })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('global-users')
    async getGlobalUsers(@Req() req, @Query() query: { search: string }) {
        const userId = req.session.passport.user;
        const search = query.search;
        return await this.userService.getGlobalUsers(userId, search);
    }
}
