import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    Res,
    UseGuards
} from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { AuthenticatedGuard } from 'src/common/guards/AuthenticatedGuard'
import { TwoFAGuard } from 'src/common/guards/TwoFaGuard'
import { VisitService } from './visit.service'

@Controller('visits')
export class VisitController {
    constructor(
        private readonly visitService: VisitService
    ) {}

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('visits')
    async getVisits(@Req() req) {
        const userId = req.session.passport.user;
        const sessionId = req.sessionID.split('.')[0];

        return await this.visitService.getVisits(sessionId, userId)
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('logout')
    async logoutVisit(@Req() req, @Query() query: { id: string }) {
        const userId = req.session.passport.user;
        
        return await this.visitService.logoutById(query.id, userId)
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('date-visits/:user_id?') 
    async getDateVisits(@Req() req, @Param('user_id') userIdParam?: string) { 
        const userId = userIdParam ?? req.session.passport.user;

        return await this.visitService.getDateVisits(userId)
    }

    @ApiResponse({ status: 200 })
    @UseGuards(AuthenticatedGuard, TwoFAGuard)
    @Get('new-visit')
    async newVisit(@Req() req, @Res() res) {
        const userId = req.session.passport.user;
        const sessionId = res.req.sessionID.split('.')[0];
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        await this.visitService.newVisit(userId, sessionId, ip, userAgent)

        return true;
    }
}
