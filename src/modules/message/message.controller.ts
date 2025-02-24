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
    UseInterceptors
} from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiResponse } from '@nestjs/swagger'
import * as fs from 'fs'
import { memoryStorage } from 'multer'
import { firstValueFrom } from 'rxjs'
import { ModalButtonAnswers } from 'src/common/@types/types'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { KafkaService } from '../kafka/kafka.service'

@Controller('messages')
export class MessageController {
    private messagesClient: ClientKafka

    constructor(private readonly kafkaService: KafkaService) {
        this.messagesClient = this.kafkaService.getMessageClient()
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

        return await firstValueFrom(
            this.messagesClient.send('get.messages', {
                userId,
                senderId,
                param,
            }),
        );
        // return await this.messagesService.getPublicMessages(userId, senderId, param);
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
        const ids = query.ids.split(',');
        const forEveryone = query.for_everyone;

        return await firstValueFrom(
            this.messagesClient.send('delete.messages', {
                ids,
                forEveryone,
                userId,
            }),
        );
        // return await this.messagesService.deleteMessages(ids, forEveryone, userId);
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

        await firstValueFrom(
            this.messagesClient.send('get.messages.search', {
                userId,
                senderId,
                search,
            }),
        );
        // return await this.messagesService.getPublicMessages(
        //     userId,
        //     senderId,
        //     null,
        //     search,
        // );
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

        await firstValueFrom(
            this.messagesClient.send('save.messages.file', {
                userId,
                files,
                uuidsArray,
            }),
        );
        // await this.messagesService.saveFile(userId, files, uuidsArray);
    }

    // @ApiResponse({ status: 201, type: FriendsDto })
    // @UseGuards(AuthenticatedGuard, TwoFAGuard)
    // @HttpCode(HttpStatus.OK)
    // @Get('get-updated-last-message')
    // async getUpdatedLastMessage(@Req() req, @Query() query) {
    //     const userId = req.session.passport.user;
    //     const senderId = query.senderId;
    //     return await this.messagesService.getUpdatedLastMessage(
    //         userId,
    //         senderId,
    //     );
    // }

    // image
    // @ApiResponse({ status: 201 })
    // @UseGuards(AuthenticatedGuard, TwoFAGuard)
    // @HttpCode(HttpStatus.OK)
    // @Get('image/:name')
    // async serveImage(@Res() res, @Req() req, @Param('name') name: string) {
    //     const userId = 4;
    //     const filePath = path.join(
    //         process.cwd(),
    //         'uploads',
    //         String(userId),
    //         String(name),
    //     );

    //     try {
    //         if (fs.existsSync(filePath)) {
    //             res.sendFile(filePath);
    //         } else {
    //             res.status(HttpStatus.NOT_FOUND).json({
    //                 message: 'File not found',
    //             });
    //         }
    //     } catch (err) {
    //         res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    //             message: 'Error serving file',
    //         });
    //     }
    // }

    @ApiResponse({ status: 201 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @Get('image/:uuid')
    async getImage(@Req() req, @Param('uuid') uuid: string, @Res() res) {
        const userId = req.session.passport.user;

        if (!userId) return;

        const data = await firstValueFrom(
            this.messagesClient.send('get.messages.image', {
                uuid,
                userId,
            }),
        );
        // const data = await this.messagesService.getImage(uuid, userId);

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
        const userId = req.session.passport.user;

        if (!userId) return res.status(403).send('Unauthorized');

        const data = await firstValueFrom(
            this.messagesClient.send('get.messages.file', {
                uuid,
                userId,
            }),
        );
        // const data = await this.messagesService.downloadFile(uuid, userId);

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
