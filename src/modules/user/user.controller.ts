import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiResponse } from '@nestjs/swagger'
import { isArray } from 'class-validator'
import { Response } from 'express'
import * as fs from 'fs'
import * as fsPromise from 'fs/promises'
import { memoryStorage } from 'multer'
import * as path from 'path'
import { ALLOWED_IMAGE_MIME_TYPE } from 'src/common/constants/imageExtension'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { TrackVisitInterceptor } from 'src/interceptors/TrackVisitInterceptor'
import { UpdateNameDto } from './dto'
import { GlobalUsers } from './dto/globalUser.dto'
import { UpdateDescriptionDto } from './dto/updateDescription'
import { UserService } from './user.service'

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('user')
    async getUser(@Req() req, @Query() query: { id: string }) {
        const userId = req.session.passport.user;
        const id = query.id ?? userId;

        return await this.userService.publicUser(id, 'id', true, true, true);
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @UseInterceptors(TrackVisitInterceptor)
    @Get('profile-user')
    async getProfileUser(@Req() req, @Query() query: { id: string }) {
        const userId = req.session.passport.user;
        const id = query.id ?? userId;

        if (Number(userId) !== Number(id)) {
            await this.userService.newViews(userId, Number(id));
        }

        return await this.userService.getProfileUser(Number(id));
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

        const answer = await this.userService.updateUser(userId, user);

        return answer
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

        const answer = await this.userService.updateUser(userId, user);

        return answer
            ? res.status(HttpStatus.OK).json({ success: true })
            : res.status(HttpStatus.BAD_REQUEST).json({ success: false });
    }

    @ApiResponse({ status: 200, type: GlobalUsers })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('global-users')
    async getGlobalUsers(@Req() req, @Query() query: { search: string }) {
        const userId = req.session.passport.user;
        const search = query.search;

        return await this.userService.getGlobalUsers(userId, search);
    }

    @ApiResponse({ status: 201 })
    @ApiConsumes('multipart/form-data')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: memoryStorage(),
            fileFilter: (req, file, callback) => {
                if (!ALLOWED_IMAGE_MIME_TYPE.includes(file.mimetype)) {
                    return callback(
                        new BadRequestException('Неверный тип файла'),
                        false,
                    );
                }

                callback(null, true);
            },
        }),
    )
    @Patch('update-avatar')
    async updateAvatar(
        @Req() req,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const userId = req.session.passport.user;
        const uuid = req.body.uuid as string;
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

        await this.userService.saveAvatar(avatar);

        return true;
    }

    @ApiResponse({ status: 200, type: GlobalUsers })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Patch('update-avatar-by-uuid')
    async updateAvatarByUuid(@Req() req, @Body() body: { uuid: string }) {
        const userId = req.session.passport.user;
        const uuid = body.uuid;

        return await this.userService.updateAvatarByUuid(userId, uuid);
    }

    @ApiResponse({ status: 200, type: GlobalUsers })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Delete('photo/:uuid')
    async deletePhoto(@Req() req, @Param('uuid') uuid: string) {
        const userId = req.session.passport.user;

        const deletedFile = await this.userService.deleteFileById(userId, uuid);

        await fsPromise
            .access(deletedFile.path)
            .then(async () => {
                return await fsPromise.rm(deletedFile.path);
            })
            .catch((err) => {
                return err;
            });
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('avatar/:uuid')
    async getImageByUuid(@Req() req, @Param('uuid') uuid: string, @Res() res) {
        const userId = req.session.passport.user as number;

        const data = await this.userService.getImageByUuid(uuid, userId);

        if (!data) {
            const defaultData = await this.userService.getImageByUuid(
                'fd89eff8-eef0-4d71-b929-4999ae0a8fe2',
                1,
            );

            if (!defaultData) {
                return res.status(HttpStatus.NOT_FOUND).send('Image not found');
            }

            res.setHeader('Content-Type', defaultData.mime_type);
            res.setHeader('Cache-Control', 'public, max-age=10800, immutable');
            res.setHeader(
                'Content-Disposition',
                `inline; filename="${encodeURIComponent(defaultData.original_name)}"`,
            );

            fs.createReadStream(defaultData.path).pipe(res);

            return;
        }

        res.setHeader('Content-Type', data.mime_type);
        res.setHeader('Cache-Control', 'public, max-age=10800, immutable');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(data.original_name)}"`,
        );

        fs.createReadStream(data.path).pipe(res);
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('photos-files/:user_id?')
    async getPhotosUuids(
        @Req() req,
        @Query('lastId') lastId: string,
        @Query('user_id') user_id?: string,
    ) {
        const userId = user_id?.length
            ? user_id
            : (req.session.passport.user as number);

        return await this.userService.getProfileFilesByUserId(
            Number(userId),
            Number(lastId),
        );
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('photos/:user_id?/:uuid')
    async getPhotos(
        @Req() req,
        @Res() res,
        @Param('uuid') uuid: string,
        @Param('user_id') user_id?: string,
    ) {
        const userId = user_id ?? req.session.passport.user;

        if (!userId) return;
        if (!uuid) return;

        const data = await this.userService.getProfilePhoto(uuid, userId);

        if (!data || data instanceof Error || !data.mime_type) return;

        res.setHeader('Content-Type', data.mime_type);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(data.original_name)}"`,
        );

        fs.createReadStream(data.path).pipe(res);
    }

    @ApiResponse({ status: 201 })
    @ApiConsumes('multipart/form-data')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: memoryStorage(),
            fileFilter: (req, file, callback) => {
                if (!ALLOWED_IMAGE_MIME_TYPE.includes(file.mimetype)) {
                    return callback(
                        new BadRequestException('Неверный тип файла'),
                        false,
                    );
                }

                callback(null, true);
            },
        }),
    )
    @Post('photos')
    async addPhotos(@Req() req, @UploadedFiles() files: Express.Multer.File[]) {
        const userId = req.session.passport.user;
        const uuids = isArray(req.body.uuid)
            ? (req.body.uuid as string)
            : (Array(req.body.uuid) as string[]);
        const userDir = path.join('uploads', String(userId));

        files.forEach(async (file, i) => {
            try {
                await fsPromise.access(userDir).catch(async () => {
                    await fsPromise.mkdir(userDir, { recursive: true });
                });
            } catch (err) {
                throw new Error('Failed to create directory for user files');
            }

            const typeParts = file.originalname.split('.');
            const typeFile = '.' + typeParts[typeParts.length - 1];

            const originalName = Buffer.from(
                file.originalname,
                'latin1',
            ).toString('utf8');

            const filePath = path.join(userDir, uuids[i] + typeFile);

            const fullPath = path.join(process.cwd(), filePath);
            await fsPromise.writeFile(fullPath, Buffer.from(file.buffer));

            const fileForDb = {
                uuid: uuids[i],
                path: fullPath,
                type: typeFile,
                size: file.size,
                mime_type: file.mimetype,
                original_name: originalName,
                user_id: Number(userId),
            };

            await this.userService.addProfilePhotos(fileForDb);
        });

        return true;
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('position')
    async getPosition(@Req() req) {
        const userId = req.session.passport.user;

        return await this.userService.getPosition(userId);
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('marker/:friendId')
    async getMarkerUserId(@Req() req, @Param('friendId') friendId: number) {
        const userId = req.session.passport.user;

        const isFriend = await this.userService.getIsFriends(userId, friendId);

        if (!isFriend) return;

        return await this.userService.publicUser(
            friendId,
            'id',
            false,
            false,
            true,
        );
    }
}
