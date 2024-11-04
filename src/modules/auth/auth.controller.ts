import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import {
    AuthenticatedGuard,
    LocalAuthGuard,
} from 'src/common/guards/LocalAuthGuard';
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard';
import { AUTH } from 'src/common/messages';
import { RateLimitGuard } from './../../common/guards/RateLimitGuard';
import { AuthService } from './auth.service';
import { RegisterUser } from './dto';
import { CheckCode } from './dto/CheckCode.dto';
import { GenerateTwoFA } from './dto/GenerateTwoFA.dto';
import { ValidateTwoFA } from './dto/ValidateTwoFA.dto';
import { VerificationPhone } from './dto/VerificationPhone.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // @ApiResponse({ status: 200, type: LoginUser })
    // @UseGuards(AuthenticatedGuard)
    // @HttpCode(HttpStatus.OK)
    // @Post('login')
    // async login(
    //     @Session() session: Record<string, any>,
    //     @Body() user: LoginUser,
    //     @Req() req,
    // ) {
    //     console.log(session);
    //     return req.user;
    // }

    @ApiResponse({ status: 201, type: RegisterUser })
    @UseGuards(AuthenticatedGuard)
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
    ): Promise<{ message: string }> {
        const isUserExists = await this.authService.isUserExist(phone);

        await this.authService.sendVerificationCode(phone);

        if (isUserExists) {
            return {
                message: AUTH.SUCCESS.PHONE_CODE_LOGIN,
            };
        } else {
            return {
                message: AUTH.SUCCESS.PHONE_CODE_REGISTRATION,
            };
        }
    }

    @ApiResponse({ status: 201, type: CheckCode })
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('check-code-phone')
    async checkCode(
        @Req() req,
        @Body() { phone, code }: CheckCode,
    ): Promise<{ message: string; redirect?: string }> {
        const isUserExists = await this.authService.isUserExist(phone);

        if (isUserExists) {
            const isTwoFAEnabled = await this.authService.isTwoFAEnabled(
                phone,
                'phone',
            );

            if (isTwoFAEnabled) {
                return {
                    message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                    redirect: '/two-auth',
                };
            } else {
                return {
                    message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                    redirect: '/',
                };
            }
        } else {
            return {
                message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                redirect: '/reg',
            };
        }
    }

    @ApiResponse({ status: 201, type: GenerateTwoFA })
    @Get('generate-2fa')
    async generate2FA(@Body() { phone }: GenerateTwoFA) {
        return await this.authService.generate2FA(phone);
    }

    @ApiResponse({ status: 200, type: CheckCode })
    @UseGuards(AuthenticatedGuard)
    @Post('validate-2fa')
    async validate2FA(@Req() req, @Body() { phone, token }: ValidateTwoFA) {
        const isValid = await this.authService.validate2FA(phone, token);

        if (isValid) {
            req.session.isTwoFAAuthenticated = true;
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

    @Get('private-two')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    privateRout1() {
        return 'Ok';
    }
}
