import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Session,
    UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import {
    AuthenticatedGuard,
    LocalAuthGuard,
} from 'src/common/guards/LocalAuthGuard';
import { AUTH } from 'src/common/messages';
import { RateLimitGuard } from './../../common/guards/RateLimitGuard';
import { AuthService } from './auth.service';
import { LoginUser, RegisterUser } from './dto';
import { CheckCode } from './dto/CheckCode.dto';
import { GenerateTwoFA } from './dto/GenerateTwoFA.dto';
import { ValidateTwoFA } from './dto/ValidateTwoFA.dto';
import { VerificationPhone } from './dto/VerificationPhone.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiResponse({ status: 200, type: LoginUser })
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(
        @Session() session: Record<string, any>,
        @Body() user: LoginUser,
        @Req() req,
    ) {
        console.log(session);
        return req.user;
    }

    @ApiResponse({ status: 201, type: RegisterUser })
    // @UseGuards(AuthGuard('local'))
    @HttpCode(HttpStatus.CREATED)
    @Post('register')
    async register(@Body() user: RegisterUser) {
        return await this.authService.register(user);
    }

    @ApiResponse({ status: 201, type: VerificationPhone })
    @UseGuards(RateLimitGuard)
    @HttpCode(HttpStatus.OK)
    @Post('send-code-phone')
    async sendCode(
        @Body() { phone }: VerificationPhone,
    ): Promise<{ message: string; isExist: boolean }> {
        const isUserExists = await this.authService.isUserExist(phone);

        await this.authService.sendVerificationCode(phone);

        if (isUserExists) {
            return {
                message: AUTH.SUCCESS.PHONE_CODE_LOGIN,
                isExist: true,
            };
        } else {
            return {
                message: AUTH.SUCCESS.PHONE_CODE_REGISTRATION,
                isExist: false,
            };
        }
    }

    @ApiResponse({ status: 201, type: CheckCode })
    @HttpCode(HttpStatus.OK)
    @Post('check-code-phone')
    async checkCode(
        @Body() { phone, code }: CheckCode,
    ): Promise<{ message: string }> {
        return await this.authService.checkVerificationCode(phone, code);
    }

    @ApiResponse({ status: 201, type: GenerateTwoFA })
    @Get('generate-2fa')
    async generate2FA(@Body() { phone }: GenerateTwoFA) {
        return await this.authService.generate2FA(phone);
    }

    @ApiResponse({ status: 200, type: CheckCode })
    @Post('validate-2fa')
    async validate2FA(@Body() { phone, token }: ValidateTwoFA) {
        const isValid = await this.authService.validate2FA(phone, token);

        if (isValid) {
            return { message: '2FA code is valid' };
        } else {
            return { message: 'Invalid 2FA code', statusCode: 401 };
        }
    }

    // @Post('get-session')
    // @UseGuards(LocalAuthGuard)
    // getHello(@Session() session: Record<string, any>, @Req() req): string {
    //     console.log(session);
    //     console.log(session.id);
    //     req.session.visited = true;
    //     session.authenticated = true;
    //     return '<h1>Hi</h1>';
    // }

    @Get('private')
    @UseGuards(AuthenticatedGuard)
    privateRout() {
        return 'Ok';
    }
}
