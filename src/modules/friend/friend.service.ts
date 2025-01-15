import { Injectable } from '@nestjs/common'
import { FriendStatuses } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { UserService } from '../user/user.service'

@Injectable()
export class FriendService {
    constructor(
        private readonly userService: UserService,
        private readonly prisma: PrismaService,
    ) {}

    async getFriends(id: string, search: string) {
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

        const friendIds = friendsFromDb.map((friend) => {
            return friend.follower_id === Number(id)
                ? friend.followed_id
                : friend.follower_id;
        });

        return await this.searchUsers(friendIds, search);
    }

    async searchUsers(friendIds: number[], search: string) {
        if (!search) {
            return await Promise.all(
                friendIds.map(
                    async (id) =>
                        await this.userService.publicUser(id, 'id', false),
                ),
            );
        }

        return await Promise.all(
            friendIds.map(async (id) => {
                const user = await this.userService.publicUser(id, 'id', false);
                if (
                    user?.name &&
                    user.name.toLowerCase().includes(search.toLowerCase())
                ) {
                    return user;
                }
                return null;
            }),
        ).then((users) => users.filter((user) => user !== null));
    }

    async addFriend(userId: string, friendId: string) {
        const isExist = await this.prisma.friend.findFirst({
            where: {
                follower_id: Number(userId),
                followed_id: Number(friendId),
            },
        });
        console.log(userId)
        console.log(friendId)
        console.log(isExist)
        if (isExist) return;

        await this.prisma.friend.create({
            data: {
                follower_id: Number(userId),
                followed_id: Number(friendId),
            },
        });
    }

    async acceptRequest(userId: string, friendId: string) {
        try {
            const res = await this.prisma.friend.updateMany({
                where: {
                    follower_id: Number(friendId),
                    followed_id: Number(userId),
                    status: FriendStatuses.pending,
                },
                data: {
                    status: FriendStatuses.confirmed,
                },
            });
        } catch (err) {
            throw new Error(err);
        }
    }

    async cancelOutgoingRequest(userId: string, friendId: string) {
        try {
            const res = await this.prisma.friend.deleteMany({
                where: {
                    follower_id: Number(userId),
                    followed_id: Number(friendId),
                    status: FriendStatuses.pending,
                },
            });
        } catch (err) {
            throw new Error(err);
        }
    }

    async deleteFriend(userId: string, friendId: string): Promise<void> {
        try {
            const [userIdNum, friendIdNum] = [Number(userId), Number(friendId)];

            const friendship = await this.prisma.friend.findFirst({
                where: {
                    status: FriendStatuses.confirmed,
                    OR: [
                        { follower_id: userIdNum, followed_id: friendIdNum },
                        { follower_id: friendIdNum, followed_id: userIdNum },
                    ],
                },
            });

            if (!friendship)
                throw new Error('Friendship not found or not confirmed');

            const isFollowerInitiator = friendship.follower_id === userIdNum;

            await this.prisma.friend.updateMany({
                where: {
                    status: FriendStatuses.confirmed,
                    follower_id: isFollowerInitiator ? userIdNum : friendIdNum,
                    followed_id: isFollowerInitiator ? friendIdNum : userIdNum,
                },
                data: {
                    status: FriendStatuses.pending,
                    ...(isFollowerInitiator && {
                        follower_id: friendIdNum,
                        followed_id: userIdNum,
                    }),
                },
            });
        } catch (err) {
            throw new Error(`Error while deleting friend: ${err.message}`);
        }
    }

    async getRequests(userId: string, type: 'incoming' | 'outgoing') {
        const users = new Array<{ id: number; name: string | null }>();

        const whereClause =
            type === 'incoming'
                ? {
                      followed_id: Number(userId),
                      status: FriendStatuses.pending,
                  }
                : {
                      follower_id: Number(userId),
                      status: FriendStatuses.pending,
                  };

        const requests = await this.prisma.friend.findMany({
            where: whereClause,
            select: {
                [type === 'incoming' ? 'follower_id' : 'followed_id']: true,
            },
        });

        await Promise.all(
            requests.map(async (request) => {
                const userIdToFetch =
                    type === 'incoming'
                        ? request.follower_id
                        : request.followed_id;

                const user = await this.prisma.user.findFirst({
                    where: {
                        id: Number(userIdToFetch),
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                });
                if (user) {
                    users.push(user);
                }
            }),
        );

        return users;
    }
}
