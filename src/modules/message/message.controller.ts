import {
    Controller,
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
import { ConfigService } from '@nestjs/config'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiResponse } from '@nestjs/swagger'
import * as fs from 'fs'
import { diskStorage } from 'multer'
import * as path from 'path'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { MessageService } from './message.service'

@Controller('messages')
export class MessageController {
    constructor(
        private readonly messagesService: MessageService,
        private readonly configService: ConfigService,
    ) {}

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
        return await this.messagesService.getMessages(userId, senderId, param);
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
        return await this.messagesService.getMessages(
            userId,
            senderId,
            null,
            search,
        );
    }

    @ApiResponse({ status: 201 })
    @ApiConsumes('multipart/form-data')
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: diskStorage({
                destination: (req, _, cb) => {
                    const userId = req.session.passport!.user;

                    const userDir = `./uploads/${userId}`;
                    if (!fs.existsSync(userDir)) {
                        fs.mkdirSync(userDir, { recursive: true });
                    }

                    cb(null, userDir);
                },
                filename: (_, file, cb) => {
                    const originalName = Buffer.from(
                        file.originalname,
                        'latin1',
                    ).toString('utf8');
                    cb(null, `${Date.now()}-${originalName}`);
                },
            }),
        }),
    )
    @Post('send-file')
    async sendFile(@Req() req, @UploadedFiles() files: Express.Multer.File[]) {
        const userId = req.session.passport.user;

        console.log(files);
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
    @ApiResponse({ status: 201 })
    // @UseGuards(AuthenticatedGuard, TwoFAGuard)
    // @HttpCode(HttpStatus.OK)
    @Get('image/:name')
    async serveImage(@Res() res, @Req() req, @Param('name') name: string) {
        const userId = 4
        const filePath = path.join(
            process.cwd(),
            'uploads',
            String(userId),
            String(name),
        );

        console.log(filePath)

        try {
            if (fs.existsSync(filePath)) {
                res.sendFile(filePath);
                console.log("find")
            } else {
                res.status(HttpStatus.NOT_FOUND).json({
                    message: 'File not found',
                });
            }
        } catch (err) {
            console.log(err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Error serving file',
            });
        }
    }
}
