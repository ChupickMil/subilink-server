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
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { Request, Response } from 'express'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { LocalAuthGuard } from 'src/common/guards/LocalAuthGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { AUTH } from 'src/common/messages'
import { RateLimitGuard } from './../../common/guards/RateLimitGuard'
import { AuthService } from './auth.service'
import { CheckCodeDto } from './dto/CheckCode.dto'
import { GenerateTwoFADto } from './dto/GenerateTwoFA.dto'
import { VerificationPhoneDto } from './dto/VerificationPhone.dto'

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiResponse({ status: 201, type: VerificationPhoneDto })
    @UseGuards(RateLimitGuard)
    @HttpCode(HttpStatus.OK)
    @Post('send-code-phone')
    async sendCode(
        @Res() res: Response,
        @Body() { phone }: VerificationPhoneDto,
    ): Promise<Response> {
        const isUserExists = await this.authService.isUserExist(phone);
        // console.log('Is user exist in DB: ' + isUserExists);

        await this.authService.sendVerificationCode(phone);

        if (isUserExists) {
            return res.status(HttpStatus.CREATED).json({
                message: AUTH.SUCCESS.PHONE_CODE_LOGIN,
            });
        } else {
            return res.status(HttpStatus.CREATED).json({
                message: AUTH.SUCCESS.PHONE_CODE_REGISTRATION,
            });
        }
    }

    @ApiResponse({ status: 201, type: CheckCodeDto })
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('check-code-phone')
    async checkCode(
        @Res() res: Response,
        @Body() { phone }: CheckCodeDto,
    ): Promise<Response> {
        const isUserReg = await this.authService.isUserReg(phone);

        // console.log('Is user reg?: ' + isUserReg);

        if (isUserReg) {
            const isTwoFAEnabled = await this.authService.isTwoFAEnabled(
                phone,
                'phone',
            );

            if (isTwoFAEnabled) {
                return res.status(HttpStatus.OK).json({
                    message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                    isTwoAuth: true,
                    isReg: true,
                });
            } else {
                return res.status(HttpStatus.OK).json({
                    message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                    isTwoAuth: false,
                    isReg: true,
                });
            }
        } else {
            return res.status(HttpStatus.OK).json({
                message: AUTH.SUCCESS.PHONE_CODE_CHECK,
                isReg: false,
            });
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
        @Res() res: Response,
        @Req() req: Request,
        @Body() { phone, code }: CheckCodeDto,
    ) {
        const isValid = await this.authService.validate2FA(phone, code);
        if (isValid) {
            req.session.isTwoFAAuthenticated = true;
            return res.status(HttpStatus.OK).json({
                success: true,
            });
        } else {
            return res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
            });
        }
    }

    @Get('validate-session')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    async validateSession(@Res() res: Response, @Req() req) {
        const userId = req.session.passport.user;

        await this.authService.updateLastVisit(userId)
        return res.status(HttpStatus.OK).json({
            success: true,
        });
    }

    @Post('logout')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    async logout(@Res() res: Response, @Req() req: Request) {
        req.session.destroy((err) => {
            if (err) {
                return res
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ success: false });
            }

            res.clearCookie('SESSION_ID');

            return res.status(HttpStatus.OK).json({ success: true });
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
