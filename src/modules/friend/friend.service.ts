import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { FriendStatuses } from '@prisma/client'
import { RedisService } from 'src/modules/redis/redis.service'
import { PrismaService } from '../prisma/prisma.service'
import { UserService } from '../user/user.service'

@Injectable()
export class FriendService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService
    ) {}

    async getFriends(id: string, search: string) {
        const friendsFromDb = await this.prisma.friend.findMany({
            where: {
                status: FriendStatuses.confirmed,
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

        const friendIds = this.filterFriendIds(friendsFromDb, Number(id));

        return await this.searchUsers(friendIds, search);
    }

    async getFriendIds(userId: number) {
        const res = await this.prisma.friend.findMany({
            where: {
                OR: [
                    {
                        followed_id: Number(userId),
                    },
                    {
                        follower_id: Number(userId),
                    },
                ],
                status: FriendStatuses.confirmed,
            },
            select: {
                followed_id: true,
                follower_id: true,
            },
        });

        return this.filterFriendIds(res, userId);
    }

    private filterFriendIds(
        friends: {
            follower_id: number;
            followed_id: number;
        }[],
        userId: number,
    ) {
        return friends.map((friend) => {
            return friend.follower_id === Number(userId)
                ? friend.followed_id
                : friend.follower_id;
        });
    }

    async searchUsers(friendIds: number[], search: string) {
        if (!search) {
            return await Promise.all(
                friendIds.map(async (id) => {
                    return await this.userService.publicUser(
                        id,
                        'id',
                        false,
                        true,
                        true,
                    );
                }),
            );
        }

        return await Promise.all(
            friendIds.map(async (id) => {
                const user = await this.userService.publicUser(
                    id,
                    'id',
                    false,
                    true,
                    true,
                );
                if (
                    user &&
                    user.name &&
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
            await this.prisma.friend.deleteMany({
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

    async getIncomingRequests(userId: number) {
        const requests = await this.prisma.friend.findMany({
            where: {
                followed_id: Number(userId),
                status: FriendStatuses.pending,
            },
            select: {
                follower_id: true,
            },
        });

        return await Promise.all(
            requests.map(async (request) => {
                return await this.userService.getUserWithSelect(
                    request.follower_id,
                    {
                        id: true,
                        name: true,
                        description: true,
                        avatar_uuid: true,
                    },
                );
            }),
        );
    }

    async getOutgoingRequests(userId: number) {
        const requests = await this.prisma.friend.findMany({
            where: {
                follower_id: Number(userId),
                status: FriendStatuses.pending,
            },
            select: {
                followed_id: true,
            },
        });

        return await Promise.all(
            requests.map(async (request) => {
                return await this.userService.getUserWithSelect(
                    request.followed_id,
                    {
                        id: true,
                        name: true,
                        description: true,
                        avatar_uuid: true,
                    },
                );
            }),
        );
    }

    async getPositions(userId: number) {
        const friendIds = await this.getFriendIds(userId);

        return await Promise.all(
            friendIds.map(async (id: number) => {
                const position = await this.redis.getGeo(id);

                if (!position[0]) return;

                return {
                    userId: id,
                    position: [position[0].longitude, position[0].latitude],
                };
            }),
        );
    }

    async getIsFriends(userId: number, friendId: number) {
        return !!(await this.prisma.friend.findFirst({
            where: {
                OR: [
                    {
                        followed_id: Number(userId),
                        follower_id: Number(friendId),
                    },
                    {
                        followed_id: Number(friendId),
                        follower_id: Number(userId),
                    },
                ],
                status: FriendStatuses.confirmed,
            },
        }));
    }
}
