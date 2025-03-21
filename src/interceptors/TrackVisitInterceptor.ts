import { AuthService } from '@auth/auth.service'
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class TrackVisitInterceptor implements NestInterceptor {
    constructor(private readonly authService: AuthService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const sessionId = req.sessionID.split('.')[0];
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        return next.handle().pipe(
            tap(() => {
                if (user) {
                    this.authService.newVisit(
                        user.id,
                        sessionId,
                        ip,
                        userAgent,
                    );
                }
            }),
        );
    }
}
