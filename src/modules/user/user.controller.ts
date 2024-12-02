import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Post,
    Query,
    Req,
    Res,
    Session,
    UseGuards,
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

import { Response } from 'express'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { UpdateUserDto } from './dto'
import { GlobalUsers } from './dto/globalUser.dto'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('get-user')
    async getUser(@Req() req) {
        const id = req.session.passport.user;
        return await this.userService.publicUser(id, 'id', true);
    }

    @ApiResponse({ status: 200, type: UpdateUserDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Post('update-name')
    async updateName(
        @Session() session,
        @Body() user: UpdateUserDto,
        @Res() res: Response,
    ) {
        console.log(await this.userService.updateUser(user));
        console.log(session);
        return res.status(HttpStatus.OK).json({
            success: true,
        });
    }

    @ApiResponse({ status: 200, type: GlobalUsers })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('get-global-users')
    async getGlobalUsers(@Query() query: {search: string, userId: string}) {
        const userId = query.userId
        return await this.userService.getGlobalUsers(userId)
    }
}
