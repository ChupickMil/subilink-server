import { AuthModule } from '@auth/auth.module';
import { forwardRef, Module } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/common/guards/LocalAuthGuard';
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard';
import { PrismaModule } from '../prisma/prisma.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
    imports: [forwardRef(() => AuthModule), PrismaModule],
    providers: [UserService, AuthenticatedGuard, TwoFAGuard],
    controllers: [UserController],
    exports: [UserService],
})
export class UserModule {}
