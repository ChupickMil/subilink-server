import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
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
import * as fs from 'fs'
import * as fsPromise from 'fs/promises'
import { memoryStorage } from 'multer'
import * as path from 'path'
import { ModalButtonAnswers } from 'src/common/@types/types'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { MessageService } from './message.service'

@Controller('messages')
export class MessageController {
    constructor(private readonly messageService: MessageService) {
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('messages')
    async getMessages(
        @Req() req,
        @Query() query: { senderId: string; param: string },
    ) {
        const userId = req.session.passport.user;
        const senderId = query.senderId;
        const param = query.param;

        return await this.messageService.getPublicMessages(userId, senderId, param)
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Delete('messages')
    async deleteMessages(
        @Req() req,
        @Query() query: { ids: string; for_everyone: ModalButtonAnswers },
    ) {
        const userId = req.session.passport.user;
        const ids = query.ids.split(',').map(Number);
        const forEveryone = query.for_everyone;

        return await this.messageService.deleteMessages(
            ids, forEveryone, userId
        )
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('search-messages')
    async getSearchMessages(
        @Req() req,
        @Query() query: { senderId: string; search: string },
    ) {
        const userId = req.session.passport.user;
        const senderId = query.senderId;
        const search = query.search;

        return await this.messageService.getPublicMessages(userId, senderId, null, search)
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
    @Post('save-file')
    async sendFile(@Req() req, @UploadedFiles() files: Express.Multer.File[]) {
        const userId = req.session.passport.user;
        const uuids = req.body.uuid as string | string[];
        const uuidsArray = Array.isArray(uuids) ? uuids : [uuids];
        const userDir = path.join('uploads', String(userId));

        try {
            await fsPromise.access(userDir).catch(async () => {
                await fsPromise.mkdir(userDir, { recursive: true });
            });
        } catch (err) {
            throw new Error('Failed to create directory for user files');
        }

        const filesToDb = await Promise.all(files.map(async (file, i) => {
            const typeParts = file.originalname.split('.');
            const typeFile = '.' + typeParts[typeParts.length - 1];

            const originalName = Buffer.from(
                file.originalname,
                'latin1',
            ).toString('utf8');

            const filePath = path.join(userDir, uuidsArray[i] + typeFile);

            const fullPath = path.join(process.cwd(), filePath);
            await fsPromise.writeFile(fullPath, Buffer.from(file.buffer));

            return {
                uuid: uuidsArray[i],
                path: fullPath,
                type: typeFile,
                size: file.size,
                mime_type: file.mimetype,
                original_name: originalName,
                user_id: Number(userId),
            };
        }));

        await this.messageService.saveFile(filesToDb)
    }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('image/:uuid')
    async getImage(@Req() req, @Param('uuid') uuid: string, @Res() res) {
        const userId = req.session.passport.user;

        if (!userId) return;

        const data = await this.messageService.getImage(uuid, userId)

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
    @Get('file/:uuid')
    async downloadFile(@Req() req, @Param('uuid') uuid: string, @Res() res) {
        const data = await this.messageService.getFileForDownload(uuid)

        if (!data) return res.status(404).send('File not found');

        const filePath = data.path;
        const fileName = data.original_name;
        const mimeType = data.mime_type || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileName)}"`,
        );

        const fileStat = fs.statSync(filePath);
        res.setHeader('Content-Length', fileStat.size);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    }
}
