import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Query,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import * as fs from 'fs'
import * as fsPromise from 'fs/promises'
import { memoryStorage } from 'multer'
import * as path from 'path'
import { firstValueFrom } from 'rxjs'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { TrackVisitInterceptor } from 'src/interceptors/TrackVisitInterceptor'
import { KafkaService } from '../kafka/kafka.service'
import { UpdateNameDto } from './dto'
import { GlobalUsers } from './dto/globalUser.dto'
import { UpdateDescriptionDto } from './dto/updateDescription'

@Controller('users')
export class UserController {
    private userClient: ClientKafka;

    constructor(private readonly kafkaService: KafkaService) {
        this.userClient = kafkaService.getUserClient();
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('user')
    async getUser(@Req() req, @Query() query: { id: string }) {
        const userId = req.session.passport.user;
        const id = query.id ?? userId;

        return await firstValueFrom(this.userClient.send('get.user', id));
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @UseInterceptors(TrackVisitInterceptor)
    @Get('profile-user')
    async getProfileUser(@Req() req, @Query() query: { id: string }) {
        const userId = req.session.passport.user;
        const id = query.id ?? userId;

        return await firstValueFrom(
            this.userClient.send('get.user.with.select', {
                userId: id,
                select: {
                    name: true,
                    img_uuid: true
                },
            }),
        );
    }

    @ApiResponse({ status: 200, type: UpdateNameDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Patch('name')
    async updateName(
        @Req() req,
        @Body() user: UpdateNameDto,
        @Res() res: Response,
    ) {
        const userId = req.session.passport.user;

        const answer = await firstValueFrom<{ isSuccess: boolean }>(
            this.userClient.send('update.user', {
                userId,
                name: user.name,
            }),
        );

        return answer.isSuccess
            ? res.status(HttpStatus.OK).json({ success: true })
            : res.status(HttpStatus.BAD_REQUEST).json({ success: false });
    }

    @ApiResponse({ status: 200, type: UpdateDescriptionDto })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Patch('description') 
    async updateDescription(
        @Req() req,
        @Body() user: UpdateDescriptionDto,
        @Res() res: Response,
    ) {
        const userId = req.session.passport.user;

        const answer = await firstValueFrom<{ isSuccess: boolean }>(
            this.userClient.send('update.user', {
                userId,
                description: user.description,
            }),
        );

        return answer.isSuccess
            ? res.status(HttpStatus.OK).json({ success: true })
            : res.status(HttpStatus.BAD_REQUEST).json({ success: false });
    }

    @ApiResponse({ status: 200, type: GlobalUsers })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('global-users')
    async getGlobalUsers(@Req() req, @Query() query: { search: string }) {
        const userId = req.session.passport.user;
        const search = query.search;
        return this.userClient.send('get.global.users', { userId, search });
    }

    @ApiResponse({ status: 201 })
    @ApiConsumes('multipart/form-data')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: memoryStorage(),
        }),
    )
    @Patch('update-avatar')
    async updateAvatar(
        @Req() req,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const userId = req.session.passport.user;
        const uuid = req.body.uuid;
        const userDir = path.join('uploads', String(userId));

        try {
            await fsPromise.access(userDir).catch(async () => {
                await fsPromise.mkdir(userDir, { recursive: true });
            });
        } catch (err) {
            throw new Error('Failed to create directory for user files');
        }

        const typeParts = files[0].originalname.split('.');
        const typeFile = '.' + typeParts[typeParts.length - 1];

        const originalName = Buffer.from(
            files[0].originalname,
            'latin1',
        ).toString('utf8');

        const filePath = path.join(userDir, uuid + typeFile);

        const fullPath = path.join(process.cwd(), filePath);
        await fsPromise.writeFile(fullPath, Buffer.from(files[0].buffer));

        const avatar = {
            uuid: uuid,
            path: fullPath,
            type: typeFile,
            size: files[0].size,
            mime_type: files[0].mimetype,
            original_name: originalName,
            user_id: Number(userId),
        };

        await firstValueFrom(
            this.userClient.send('update.avatar.file', {
                avatar,
            }),
        );

        return true
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('avatar/:uuid')
    async getImageByUuid(@Req() req, @Param('uuid') uuid: string, @Res() res) {
        const userId = req.session.passport.user;

        if (!userId) return;

        const data = await firstValueFrom(
            this.userClient.send('get.profile.image.by.uuid', {
                uuid,
                userId,
            }),
        );

        if (!data) return;
        res.setHeader('Content-Type', data.mime_type);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(data.original_name)}"`,
        );

        fs.createReadStream(data.path).pipe(res);
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('avatar')
    async getImage(@Req() req, @Res() res) {
        const userId = req.session.passport.user;

        if (!userId) return;

        const data = await firstValueFrom(
            this.userClient.send('get.profile.image', {
                userId,
            }),
        );

        if (!data) return;
        res.setHeader('Content-Type', data.mime_type);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(data.original_name)}"`,
        );

        fs.createReadStream(data.path).pipe(res);
    }
}
