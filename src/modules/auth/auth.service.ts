import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import * as qrcode from 'qrcode'
import * as speakeasy from 'speakeasy'
import { AUTH } from 'src/common/messages'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { UserService } from '../user/user.service'
import { VisitService } from '../visit/visit.service'
import { LoginUserDto, RegisterUserDto } from './dto'

@Injectable()
export class AuthService {
    constructor(
        private readonly redis: RedisService,
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly visitService: VisitService,
    ) {}

    async register(user: RegisterUserDto) {
        try {
            const isHaveUser = await this.userService.findUser(
                user.phone,
                'phone',
            );

            if (isHaveUser) return { message: 'User already registered' };

            const newUser = {
                phone: user.phone,
                name: user.name,
            };

            await this.userService.createUser(newUser);

            return { message: 'User is registered' };
        } catch (err) {
            throw new Error(err);
        }
    }

    async login(user: LoginUserDto) {}

    async logoutBySessionId(sessionId: string) {
        const visit = await this.visitService.findVisit(sessionId, {
            id: true,
        });

        if (!visit) return;

        return await this.visitService.logout(sessionId);
    }

    async isValidatedUser(phone: string, password: string) {
        const user = await this.userService.findUser(phone, 'phone');

        if (!user) {
            return false;
        }

        return await this.comparePassword(password, user.password!);
    }

    public async isUserExist(phone: string): Promise<boolean> {
        return !!(await this.userService.findUser(phone, 'phone'));
    }

    public async isUserReg(phone: string): Promise<boolean> {
        return !!(await this.userService.getName(phone));
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
        const res = await this.checkVerificationCode(phone, code);

        if (res.message === AUTH.ERROR.PHONE_CODE_CHECK) {
            return null;
        }

        const user = await this.userService.findUser(phone, 'phone');

        if (!user) {
            return await this.userService.createUser({ phone });
        }

        return user;
    }

    async isTwoFAEnabled(
        value: number | string,
        type: 'id' | 'phone',
    ): Promise<boolean> {
        let user_id: number;

        if (type === 'phone') {
            const user = await this.userService.findUserSelect(
                value.toString(),
                'phone',
                { id: true },
            );

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
                name: `Sabilink (${phone})`,
            });

            const user = await this.userService.findUserSelect(phone, 'phone', {
                id: true,
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
                await this.prisma.twoFA.create({
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
        await this.userService.updateLastVisit(userId);
    }

    public async newVisit(
        id: number,
        sessionId: string,
        ip: string | undefined,
        userAgent: string | undefined,
    ) {
        return await this.visitService.newVisit(id, sessionId, ip, userAgent);
    }
}
