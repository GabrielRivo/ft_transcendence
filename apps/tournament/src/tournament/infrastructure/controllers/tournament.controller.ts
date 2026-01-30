import {
    Body,
    BodySchema,
    Controller,
    Delete,
    Get,
    Param,
    JWTBody,
    Inject,
    Post,
    UnauthorizedException,
    ResponseSchema
} from 'my-fastify-decorators';

import { CancelTournamentUseCase } from '../../application/use-cases/cancel-tournament.use-case.js';
import { CreateTournamentUseCase } from '../../application/use-cases/create-tournament.use-case.js';
import { GetTournamentUseCase } from '../../application/use-cases/get-tournament.use-case.js';
import { JoinTournamentUseCase } from '../../application/use-cases/join-tournament.use-case.js';
import { LeaveTournamentUseCase } from '../../application/use-cases/leave-tournament.use-case.js';
import { GetActiveTournamentUseCase } from '../../application/use-cases/active-tournament.use-case.js';
import { JoinGuestTournamentUseCase } from '../../application/use-cases/join-guest-tournament.use-case.js';


import { CreateTournamentDto, CreateTournamentSchema } from '../../application/dtos/create-tournament.dto.js';
import { JoinGuestTournamentDto } from '../../application/dtos/join-guest-tournament.dto.js';

import { TournamentResponseSchema } from '../dtos/responses/tournament.response.dto.js';

@Controller('/')
export class TournamentController {
    @Inject(CancelTournamentUseCase)
    private cancelTournamentUseCase!: CancelTournamentUseCase;

    @Inject(CreateTournamentUseCase)
    private createTournamentUseCase!: CreateTournamentUseCase;

    @Inject(GetTournamentUseCase)
    private getTournamentUseCase!: GetTournamentUseCase;

    @Inject(JoinTournamentUseCase)
    private joinTournamentUseCase!: JoinTournamentUseCase;

    @Inject(GetActiveTournamentUseCase)
    private getActiveTournamentUseCase!: GetActiveTournamentUseCase;

    @Post('/')
    @BodySchema(CreateTournamentSchema)
    public async create(
        @Body() body: CreateTournamentDto,
        @JWTBody() user: any
    ) {
        if (!user) throw new UnauthorizedException();
        const id = await this.createTournamentUseCase.execute(body, String(user.id), user.username);
        return { id };
    }

    @Get('/active')
    @ResponseSchema(200, TournamentResponseSchema)
    public async getActive(@JWTBody() user: any) {
        if (!user) throw new UnauthorizedException();
        const tournament = await this.getActiveTournamentUseCase.execute(String(user.id));
        return tournament;
    }

    @Get('/:id')
    @ResponseSchema(200, TournamentResponseSchema)
    public async get(@Param('id') id: string) {
        const tournament = await this.getTournamentUseCase.execute(id);
        return tournament;
    }

    @Delete('/:id')
    public async cancel(@Param('id') id: string, @JWTBody() user: any) {
        if (!user) throw new UnauthorizedException();
        await this.cancelTournamentUseCase.execute(id, String(user.id));
        return { success: true };
    }

    @Post('/:id/join')
    public async join(@Param('id') id: string, @JWTBody() user: any) {
        if (!user) throw new UnauthorizedException();
        await this.joinTournamentUseCase.execute(
            id,
            { displayName: user.username },
            String(user.id),
            false
        );
        const tournament = await this.getTournamentUseCase.execute(id);
        return tournament;
    }
    @Inject(LeaveTournamentUseCase)
    private leaveTournamentUseCase!: LeaveTournamentUseCase;

    @Post('/:id/leave')
    public async leave(@Param('id') id: string, @JWTBody() user: any) {
        if (!user) throw new UnauthorizedException();
        await this.leaveTournamentUseCase.execute(id, String(user.id));
        return { success: true };
    }

    @Inject(JoinGuestTournamentUseCase)
    private joinGuestTournamentUseCase!: JoinGuestTournamentUseCase;

    @Post('/join-by-code')
    public async joinByCode(@Body() body: JoinGuestTournamentDto, @JWTBody() user: any) {
        if (!user) throw new UnauthorizedException();
        const tournament = await this.joinGuestTournamentUseCase.execute(
            body,
            String(user.id),
            user.username,
            user.isGuest === true
        );
        return tournament;
    }
}