import { AuthService } from '@auth/auth.service';
import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { phone } = request.body;

        const isRateLimited = await this.authService.isRateLimited(phone);

        if (isRateLimited) {
            throw new HttpException(
                'Too many requests. Wait 2 minutes',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        return true;
    }
}
