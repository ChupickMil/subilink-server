import { AuthService } from '@auth/auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'phone',
            passwordField: 'code',
        });
        console.log('local strategy');
    }

    async validate(phone: string, code: string): Promise<any> {
        const user = await this.authService.isValidateVerificationCode(
            phone,
            code,
        );

        console.log(user);

        if (!user) {
            throw new UnauthorizedException();
        }

        return user;
    }
}
