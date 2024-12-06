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
        const friendsFromDb = await this.prisma.friend.findMany({
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

        const friendIds = friendsFromDb.map(friend => {
            return friend.follower_id === Number(id) ? friend.followed_id : friend.follower_id;
        });

        console.log(friendIds)

        const friends = await Promise.all(friendIds.map(async (id) => await this.userService.publicUser(id, 'id', false)));

		return friends
    }

	async addFriend(userId: string, friendId: string){
        const isExist = await this.prisma.friend.findFirst({
            where: {
                follower_id: Number(userId),
                followed_id: Number(friendId)
            }
        })

        if(isExist) return

        await this.prisma.friend.create({
            data: {
                follower_id: Number(userId),
                followed_id: Number(friendId)
            }
        })
	}

    async getRequests(userId: string){
        return await this.prisma.friend.findMany({
            where: {
                followed_id: Number(userId)
            }
        })
    }
}
