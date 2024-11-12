import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<any> {
        const req = context.switchToHttp().getRequest<Request>();
        console.log('SESSION_ID: ' + req.cookies.SESSION_ID);
        console.log('Auth?: ' + req.isAuthenticated());
        return req.isAuthenticated();
    }
}
