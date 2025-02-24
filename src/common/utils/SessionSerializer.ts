import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator'
import { ClientKafka } from '@nestjs/microservices/client/client-kafka'
import { PassportSerializer } from '@nestjs/passport'
import { User } from '@prisma/client'
import { firstValueFrom } from 'rxjs'
import { KafkaService } from 'src/modules/kafka/kafka.service'

@Injectable()
export class SessionSerializer extends PassportSerializer {
    private userClient: ClientKafka
    
    constructor(
        private readonly kafkaService: KafkaService
    ) {
        super();
    }
    
    public onApplicationBootstrap() {
        this.userClient = this.kafkaService.getUserClient();
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
