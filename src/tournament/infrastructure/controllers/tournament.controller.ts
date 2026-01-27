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
    Query,
    QuerySchema,
    UnauthorizedException,
    ResponseSchema
} from 'my-fastify-decorators';

import { CancelTournamentUseCase } from '../../application/use-cases/cancel-tournament.use-case.js';
import { CreateTournamentUseCase } from '../../application/use-cases/create-tournament.use-case.js';
import { GetTournamentUseCase } from '../../application/use-cases/get-tournament.use-case.js';
import { ListTournamentsUseCase } from '../../application/use-cases/list-tournaments.use-case.js';
import { JoinTournamentUseCase } from '../../application/use-cases/join-tournament.use-case.js';
import { LeaveTournamentUseCase } from '../../application/use-cases/leave-tournament.use-case.js';
import { GetActiveTournamentUseCase } from '../../application/use-cases/active-tournament.use-case.js';

import { CreateTournamentDto, CreateTournamentSchema } from '../../application/dtos/create-tournament.dto.js';
import { ListTournamentsDto, ListTournamentsSchema } from '../../application/dtos/list-tournaments.dto.js';
import { TournamentResponseSchema } from '../dtos/responses/tournament.response.dto.js';

@Controller('/')
export class TournamentController {
    @Inject(CancelTournamentUseCase)
    private cancelTournamentUseCase!: CancelTournamentUseCase;

    @Inject(CreateTournamentUseCase)
    private createTournamentUseCase!: CreateTournamentUseCase;

    @Inject(GetTournamentUseCase)
    private getTournamentUseCase!: GetTournamentUseCase;

    @Inject(ListTournamentsUseCase)
    private listTournamentsUseCase!: ListTournamentsUseCase;

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
        console.log('[Backend] Create tournament request:', { body, userId: user?.id });
        if (!user) throw new UnauthorizedException();
        const id = await this.createTournamentUseCase.execute(body, String(user.id), user.username);
        return { id };
    }

    @Get('/')
    @QuerySchema(ListTournamentsSchema)
    @ResponseSchema(200, {
        type: 'array',
        items: TournamentResponseSchema
    })
    public async list(@Query() query: ListTournamentsDto) {
        const tournaments = await this.listTournamentsUseCase.execute(query);
        return tournaments;
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
}