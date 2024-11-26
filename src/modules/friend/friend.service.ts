import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UserService } from '../user/user.service'

@Injectable()
export class FriendService {
    constructor(
        private readonly userService: UserService,
        private readonly prisma: PrismaService,
    ) {}

    async getFriends(id: string) {
        const friends = await this.prisma.friend.findMany({
            where: {
                status: 'confirmed',
                OR: [
                    {
                        follower_id: Number(id),
                    },
                    {
                        followed_id: Number(id),
                    },
                ],
            },
        });
		return friends
    }

	async addFriend(userId: string, friendId: string){
		console.log(userId)
		console.log(friendId)
	}
}
