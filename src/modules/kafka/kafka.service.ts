import { Inject, Injectable } from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices'

@Injectable()
export class KafkaService {
    constructor(
        @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
        @Inject('VISIT_SERVICE') private readonly visitClient: ClientKafka,
        @Inject('MESSAGE_SERVICE') private readonly messageClient: ClientKafka,
        @Inject('CHAT_SERVICE') private readonly chatClient: ClientKafka,
        @Inject('FRIEND_SERVICE') private readonly friendClient: ClientKafka,
        @Inject('FILES_SERVICE') private readonly fileClient: ClientKafka,
    ) {}

    async onModuleInit() {
        this.userClient.subscribeToResponseOf('create.user');
        this.userClient.subscribeToResponseOf('find.user');
        this.userClient.subscribeToResponseOf('get.name');
        this.userClient.subscribeToResponseOf('get.user');
        this.userClient.subscribeToResponseOf('delete.user');
        this.userClient.subscribeToResponseOf('get.global.users');
        this.userClient.subscribeToResponseOf('update.user');
        this.userClient.subscribeToResponseOf('get.user.with.select');
        this.userClient.subscribeToResponseOf('update.avatar.file');
        this.userClient.subscribeToResponseOf('get.profile.image.by.uuid');
        this.userClient.subscribeToResponseOf('get.profile.image');
        this.userClient.subscribeToResponseOf('get.profile.photo');
        this.userClient.subscribeToResponseOf('update.avatar.by.uuid');
        this.userClient.subscribeToResponseOf('add.profile.photos');
        this.userClient.subscribeToResponseOf('delete.file.by.uuid');
        this.userClient.subscribeToResponseOf('new.views');
        this.userClient.subscribeToResponseOf('get.profile.user');
        this.userClient.subscribeToResponseOf('get.marker.user');
        this.userClient.subscribeToResponseOf('get.position');

        this.visitClient.subscribeToResponseOf('new.visit');
        this.visitClient.subscribeToResponseOf('get.visits');
        this.visitClient.subscribeToResponseOf('logout.by.id');
        this.visitClient.subscribeToResponseOf('get.date.visits');
        this.visitClient.subscribeToResponseOf('new.visit');
        this.visitClient.subscribeToResponseOf('update.last.visit');
        this.visitClient.subscribeToResponseOf('find.visit.by.sessionid');
        this.visitClient.subscribeToResponseOf('logout.visit');

        this.messageClient.subscribeToResponseOf('get.messages');
        this.messageClient.subscribeToResponseOf('delete.messages');
        this.messageClient.subscribeToResponseOf('get.messages.search');
        this.messageClient.subscribeToResponseOf('save.messages.file');
        this.messageClient.subscribeToResponseOf('get.messages.file');
        this.messageClient.subscribeToResponseOf('get.messages.image');
        this.messageClient.subscribeToResponseOf('send.new.message');
        this.messageClient.subscribeToResponseOf('update.message.status');

        this.chatClient.subscribeToResponseOf('get.chats');
        this.chatClient.subscribeToResponseOf('get.chat.info');
        this.chatClient.subscribeToResponseOf('get.count.unread.messages');
        this.chatClient.subscribeToResponseOf('delete.chats');
        this.chatClient.subscribeToResponseOf('get.is.has.chat');
        this.chatClient.subscribeToResponseOf('get.is.deleted.chat');
        this.chatClient.subscribeToResponseOf('recovery.chat');
        this.chatClient.subscribeToResponseOf('create.chat');
        this.chatClient.subscribeToResponseOf('get.chat.id');

        this.friendClient.subscribeToResponseOf('get.friends');
        this.friendClient.subscribeToResponseOf('get.profile.friends');
        this.friendClient.subscribeToResponseOf('delete.friend');
        this.friendClient.subscribeToResponseOf('get.friends.requests');
        this.friendClient.subscribeToResponseOf('get.outgoing.requests');
        this.friendClient.subscribeToResponseOf('add.friend');
        this.friendClient.subscribeToResponseOf('accept.request');
        this.friendClient.subscribeToResponseOf('cancel.outgoing.request');
        this.friendClient.subscribeToResponseOf('get.friends.ids');
        this.friendClient.subscribeToResponseOf('get.positions');
        this.friendClient.subscribeToResponseOf('get.is.friends');

        this.fileClient.subscribeToResponseOf('get.files.by.uuids');
        this.fileClient.subscribeToResponseOf('get.profile.files.by.userid');

        await this.visitClient.connect();
        await this.userClient.connect();
        await this.messageClient.connect();
        await this.friendClient.connect();
        await this.chatClient.connect();
        await this.fileClient.connect();
    }

    public getMessageClient() {
        return this.messageClient;
    }
	
    public getUserClient() {
        return this.userClient;
    }
	
    public getVisitClient() {
        return this.visitClient;
    }
	
    public getFriendClient() {
        return this.friendClient;
    }
	
    public getChatClient() {
        return this.chatClient;
    }

    public getFileClient() {
        return this.fileClient;
    }
}
