import { AuthService } from '@auth/auth.service';
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class TwoFAGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const id = request.session.passport.user; // достаем из session паспорт с нашим пользователем

        if (!id) {
            throw new UnauthorizedException();
        }

        const isTwoFAEnabled = await this.authService.isTwoFAEnabled(id, 'id'); // если есть двойная аутентификация, требуем ее, если нет, пропускаем

        if (!isTwoFAEnabled) {
            return true;
        }

        // проверяем сессию на анличие двойной аутентификации
        if (request.session.isTwoFAAuthenticated) {
            return true;
        }

        throw new UnauthorizedException('2FA is required to access this route');
    }
}
