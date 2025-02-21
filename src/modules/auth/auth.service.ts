import { Inject, Injectable } from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices'
import * as bcrypt from 'bcrypt'
import * as qrcode from 'qrcode'
import { firstValueFrom } from 'rxjs'
import * as speakeasy from 'speakeasy'
import { AUTH } from 'src/common/messages'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { LoginUserDto, RegisterUserDto } from './dto'
import { IUser } from './interfaces/IUser.interface'

@Injectable()
export class AuthService {
    constructor(
        private readonly redis: RedisService,
        private readonly prisma: PrismaService,
        @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
        @Inject('VISIT_SERVICE') private readonly visitService: ClientKafka,
    ) {}

    async onModuleInit() {
        this.userClient.subscribeToResponseOf('create.user');
        this.userClient.subscribeToResponseOf('find.user');
        this.userClient.subscribeToResponseOf('get.name');
        this.visitService.subscribeToResponseOf('new.visit')

        await this.visitService.connect()
        await this.userClient.connect();
    }

    async register(user: RegisterUserDto) {
        try {
            const isHaveUser = await firstValueFrom<boolean>(
                this.userClient.send('find.user', {
                    phone: user.phone,
                    type: 'phone',
                }),
            );
            // const isHaveUser = await this.userService.findUser(
            //     user.phone,
            //     'phone',
            // );

            if (isHaveUser) return { message: 'User already registered' };

            const newUser = {
                phone: user.phone,
                name: user.name,
            };

            this.userClient.send('create.user', newUser);
            // await this.userService.createUser(newUser);

            return { message: 'User is registered' };
        } catch (err) {
            throw new Error(err);
        }
    }

    async login(user: LoginUserDto) {}

    async logoutBySessionId(sessionId: string) {
        const visit = await this.prisma.visit.findFirst({
            where: {
                session_id: sessionId,
            },
        });

        if (!visit) return;

        await this.prisma.visit.update({
            where: {
                id: visit.id,
            },
            data: {
                is_active: false,
            },
        });
    }

    async isValidatedUser(phone: string, password: string) {
        const user = await firstValueFrom<IUser>(
            this.userClient.send('find.user', {
                phone,
                type: 'phone',
            }),
        );

        if (!user) {
            return false;
        }

        return await this.comparePassword(password, user.password!);
    }

    public async isUserExist(phone: string): Promise<boolean> {
        return !!(await firstValueFrom(
            this.userClient.send('find.user', { phone, type: 'phone' }),
        ));
    }

    public async isUserReg(phone: string): Promise<boolean> {
        return !!(await firstValueFrom(
            this.userClient.send('get.name', { phone }),
        ));
    }

    async sendVerificationCode(phone: string): Promise<void> {
        const code = this.generateVerificationCode();

        // await this.smsMts  // отправка сообщения
        // await telega  // либо на телеграм

        await this.saveVerificationCode(phone, code);
    }

    async checkVerificationCode(
        phone: string,
        code: string,
    ): Promise<{ message: string }> {
        const codeFromRedis = await this.redis.get(phone);

        if (!codeFromRedis) {
            return { message: AUTH.ERROR.PHONE_CODE_CHECK };
        }

        if (Number(code) === Number(codeFromRedis)) {
            await this.redis.del(phone);
            return { message: AUTH.SUCCESS.PHONE_CODE_CHECK };
        }

        return { message: AUTH.ERROR.PHONE_CODE_CHECK };
    }

    async isValidateVerificationCode(phone: string, code: string) {
        // console.log(phone);
        // console.log(code);
        const res = await this.checkVerificationCode(phone, code);

        if (res.message === AUTH.ERROR.PHONE_CODE_CHECK) {
            return null;
        }

        const user = await this.prisma.user.findFirst({
            where: {
                phone,
            },
        });

        if (!user) {
            const user = await firstValueFrom(
                this.userClient.send('create.user', { phone }),
            );
            // const user = await this.userService.createUser({ phone });
            return user;
        }

        return user;
    }

    async isTwoFAEnabled(
        value: number | string,
        type: 'id' | 'phone',
    ): Promise<boolean> {
        let user_id: number;

        if (type === 'phone') {
            const user = await this.prisma.user.findUnique({
                where: { phone: value.toString() },
                select: { id: true },
            });

            if (!user) {
                return false;
            }

            user_id = user.id;
        } else {
            user_id = Number(value);
        }

        const twoFa = await this.prisma.twoFA.findFirst({
            where: { user_id },
            select: { autentificator_code: true, oauth: true },
        });

        return Boolean(twoFa?.autentificator_code || twoFa?.oauth);
    }

    async isRateLimited(phone: string) {
        // если есть номер в редис, новый код не отправиться
        const code = await this.redis.get(phone);

        if (code) return true;
    }

    async generate2FA(phone: string) {
        try {
            const secret = speakeasy.generateSecret({
                name: `Subilink (${phone})`,
            });

            const user = await this.prisma.user.findUnique({
                where: {
                    phone,
                },
                select: {
                    id: true,
                },
            });

            if (!user?.id) return { message: 'Not exists user' };

            const isExistsCode = await this.prisma.twoFA.findUnique({
                where: {
                    user_id: user.id,
                },
            });

            if (isExistsCode?.autentificator_code) {
                await this.prisma.twoFA.update({
                    where: {
                        user_id: user.id,
                    },
                    data: {
                        autentificator_code: secret.base32,
                    },
                });
            } else {
                const res = await this.prisma.twoFA.create({
                    data: {
                        user_id: user.id,
                        autentificator_code: secret.base32,
                    },
                });
            }

            const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

            return {
                qrCodeUrl: qrCodeDataUrl,
            };
        } catch (err) {
            console.log(err);
        }
    }

    async validate2FA(
        phone: string,
        token: string,
    ): Promise<boolean | { message: string }> {
        const secret = await this.prisma.twoFA.findFirst({
            where: {
                user: {
                    phone,
                },
            },
            select: {
                autentificator_code: true,
            },
        });

        if (!secret?.autentificator_code) return { message: 'Error' };

        return await this.getUserSecret(secret.autentificator_code, token);
    }

    private async getUserSecret(secret: string, token: string) {
        return await speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token,
            window: 1,
        });
    }

    private async saveVerificationCode(
        phone: string,
        code: number,
    ): Promise<void> {
        const timer = 1000 * 60 * 2; // 2 минуты
        await this.redis.set(phone, code, timer);
    }

    private generateVerificationCode(): number {
        const min = 100000; // минимум
        const max = 999999; // максимум
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds); // соль добавляется автоматически
    }

    private async comparePassword(
        password: string,
        hash: string,
    ): Promise<boolean> {
        const isMatch = await bcrypt.compare(password, hash);
        return isMatch;
    }

    public async updateLastVisit(userId: string) {
        await this.prisma.user.update({
            where: {
                id: Number(userId),
            },
            data: {
                last_visit: new Date(),
            },
        });
    }

    public async newVisit(
        id: number,
        sessionId: string,
        ip: string | undefined,
        userAgent: string | undefined,
    ) {
        return await firstValueFrom(
            this.visitService.emit('new.visit', {
                id,
                sessionId,
                ip,
                userAgent,
            }),
        );
    }
}
