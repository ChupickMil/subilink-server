import {
    Controller,
    Get,
    Inject,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices'
import { ApiResponse } from '@nestjs/swagger'
import { firstValueFrom } from 'rxjs'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'

@Controller('visits')
export class VisitController {
    constructor(
        @Inject('VISIT_SERVICE') private readonly client: ClientKafka,
    ) {
        this.client.subscribeToResponseOf('get.visits');
        this.client.subscribeToResponseOf('logout.by.id');
        this.client.subscribeToResponseOf('get.date.visits');
        this.client.subscribeToResponseOf('new.visit');
    }
    
    async onModuleInit() {
        await this.client.connect();
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('visits')
    async getVisits(@Req() req) {
        const userId = req.session.passport.user;
        const sessionId = req.sessionID.split('.')[0];

        return await firstValueFrom(
            this.client.send('get.visits', { sessionId, userId }),
        );
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('logout')
    async logoutVisit(@Req() req, @Query() query: { id: string }) {
        const userId = req.session.passport.user;
        return await firstValueFrom(
            this.client.emit('logout.by.id', {
                id: query.id,
                userId,
            }),
        );
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('date-visits')
    async getDateVisits(@Req() req) {
        const userId = req.session.passport.user;
        return await firstValueFrom(
            this.client.send('get.date.visits', { userId }),
        );
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('new-visit')
    async newVisit(@Req() req, @Res() res) {
        const userId = req.session.passport.user;
        const sessionId = res.req.sessionID.split('.')[0];
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        await firstValueFrom(
            this.client.send('new.visit', {
                userId,
                sessionId,
                ip,
                userAgent,
            }),
        );
        return true;
    }
}
