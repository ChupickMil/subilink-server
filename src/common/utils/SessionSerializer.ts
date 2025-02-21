import { Inject } from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices/client/client-kafka'
import { PassportSerializer } from '@nestjs/passport'
import { User } from '@prisma/client'
import { firstValueFrom } from 'rxjs'

export class SessionSerializer extends PassportSerializer {
    constructor(
        @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    ) {
        super();
    }

    async onModuleInit() {
        this.userClient.subscribeToResponseOf('find.user');
        await this.userClient.connect();
    }

    serializeUser(user: User, done: (err, user) => void) {
        done(null, user.id);
    }

    async deserializeUser(user: User, done: (err, user) => void) {
        console.log('Deserialize user ', user);
        const userDB = await firstValueFrom(
            this.userClient.send('find.user', { userId: user.id, type: 'id' }),
        );
        return userDB ? done(null, userDB) : done(null, null);
    }
}
