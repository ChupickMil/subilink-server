import { Inject } from '@nestjs/common'
import { PassportSerializer } from '@nestjs/passport'
import { User } from '@prisma/client'
import { UserService } from 'src/modules/user/user.service'

export class SessionSerializer extends PassportSerializer {
    constructor(
        @Inject('USER_SERVICE') private readonly userService: UserService,
    ) {
        super();
    }

    serializeUser(user: User, done: (err, user) => void) {
        // console.log('Serialize user ', user);
        done(null, user.id);
    }

    async deserializeUser(user: User, done: (err, user) => void) {
        console.log('Deserialize user ', user);
        const userDB = await this.userService.findUser(user.id, 'id');
        return userDB ? done(null, userDB) : done(null, null);
    }
}
