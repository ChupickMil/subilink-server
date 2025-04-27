import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator'
import { PassportSerializer } from '@nestjs/passport'
import { User } from '@prisma/client'
import { UserService } from 'src/modules/user/user.service'

@Injectable()
export class SessionSerializer extends PassportSerializer {
    constructor(
        private readonly userService: UserService
    ) {
        super();
    }
    
    public onApplicationBootstrap() {
    }

    serializeUser(user: User, done: (err, user) => void) {
        console.log("Serialize user " + user.id)
        done(null, user.id);
    }

    async deserializeUser(user: number, done: (err, user) => void) {
        console.log('Deserialize user ', user);
        const userDB = await this.userService.findUser(Number(user), 'id')
        return userDB ? done(null, userDB) : done(null, null);
    }
}
