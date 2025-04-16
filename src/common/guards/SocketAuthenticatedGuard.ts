import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import * as cookie from 'cookie'
import * as signature from 'cookie-signature'
import { RedisService } from 'src/modules/redis/redis.service'

@Injectable()
export class SocketAuthenticatedGuard implements CanActivate {
	constructor(private readonly redis: RedisService) {}
	
    async canActivate(context: ExecutionContext) {
        const client = context.switchToWs().getClient();
        const cookies = cookie.parse(client.handshake.headers.cookie || '');
        const sessionCookie = cookies['SESSION_ID'];

		if(!sessionCookie){
			throw new UnauthorizedException('No valid cookie')
		}

		const sessionId = signature.unsign(sessionCookie.slice(2), process.env.SESSION_SECRET);
		if(!sessionId){
			throw new UnauthorizedException('No valid cookie')
		}

		const session = await this.redis.getSession(`sess:${sessionId}`);
		if(!session){
			throw new UnauthorizedException('No valid session')
		}

		client.data.user = session.passport.user;
		return true
    }
}
