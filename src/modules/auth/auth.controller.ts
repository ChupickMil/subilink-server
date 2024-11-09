import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
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
import { CheckCodeDto } from './dto/CheckCode.dto';
import { GenerateTwoFADto } from './dto/GenerateTwoFA.dto';
import { VerificationPhoneDto } from './dto/VerificationPhone.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // @ApiResponse({ status: 200, type: LoginUserDto })
    // @UseGuards(AuthenticatedGuard)
    // @HttpCode(HttpStatus.OK)
    // @Post('login')
    // async login(
    //     @Session() session: Record<string, any>,
    //     @Body() user: LoginUserDto,
    //     @Req() req,
    // ) {
    //     console.log(session);
    //     return req.user;
    // }

    // @ApiResponse({ status: 201, type: RegisterUserDto })
    // @UseGuards(AuthenticatedGuard)
    // @HttpCode(HttpStatus.CREATED)
    // @Post('register')
    // async register(@Body() user: RegisterUserDto) {
    //     return await this.authService.register(user);
    // }

    @ApiResponse({ status: 201, type: VerificationPhoneDto })
    @UseGuards(RateLimitGuard)
    @HttpCode(HttpStatus.OK)
    @Post('send-code-phone')
    async sendCode(
        @Res() res,
        @Body() { phone }: VerificationPhoneDto,
    ): Promise<{ message: string }> {
        const isUserExists = await this.authService.isUserExist(phone);
        console.log(isUserExists);

        await this.authService.sendVerificationCode(phone);

        if (isUserExists) {
            return res.status(201).json({
                message: AUTH.SUCCESS.PHONE_CODE_LOGIN,
            });
        } else {
            return res.status(201).json({
                message: AUTH.SUCCESS.PHONE_CODE_REGISTRATION,
            });
        }
    }

    @ApiResponse({ status: 201, type: CheckCodeDto })
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('check-code-phone')
    async checkCode(
        @Req() req,
        @Body() { phone, code }: CheckCodeDto,
    ): Promise<{ message: string; isTwoAuth?: boolean; isReg?: boolean }> {
        const isUserReg = await this.authService.isUserReg(phone);

        console.log(isUserReg);

        if (isUserReg) {
            const isTwoFAEnabled = await this.authService.isTwoFAEnabled(
                phone,
                'phone',
            );

            if (isTwoFAEnabled) {
                return {
                    message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                    isTwoAuth: true,
                    isReg: true,
                };
            } else {
                return {
                    message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                    isTwoAuth: false,
                    isReg: true,
                };
            }
        } else {
            return {
                message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                isReg: false,
            };
        }
    }

    @ApiResponse({ status: 201, type: GenerateTwoFADto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('generate-2fa')
    async generate2FA(@Body() { phone }: GenerateTwoFADto) {
        return await this.authService.generate2FA(phone);
    }

    @ApiResponse({ status: 200, type: CheckCodeDto })
    @UseGuards(AuthenticatedGuard)
    @Post('authenticator-check')
    async validate2FA(
        @Res() res,
        @Req() req,
        @Body() { phone, code }: CheckCodeDto,
    ) {
        const isValid = await this.authService.validate2FA(phone, code);
        if (isValid) {
            req.session.isTwoFAAuthenticated = true;
            return res.status(200).json({
                success: true,
            });
        } else {
            return res.status(401).json({
                success: false,
            });
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

    @Get('validate-session')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    async validateSession(@Res() res, @Req() req) {
        return res.status(200).json({
            message: 'Success',
        });
    }

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
