import type { FastifyReply } from 'fastify';

import { 
    Body, 
    BodySchema, 
    Controller, 
    Get,
    JWTBody,
    Param, 
    Post, 
    Res, 
    UseGuards
} from 'my-fastify-decorators';

import { CreateTournamentDto, CreateTournamentSchema } from './dto/create-tournament.dto.js';
import { JoinTournamentDto, JoinTournamentSchema } from './dto/join-tournament.dto.js';
import { StartTournamentDto, StartTournamentSchema } from './dto/start-tournament.dto.js';
import { type JwtPayload, OptionalAuthGuard } from '../guards/optional-auth.guard.js';

@UseGuards(OptionalAuthGuard)
@Controller('/api/tournaments')
export class TournamentController {
    @Post('/')
    @BodySchema(CreateTournamentSchema)
    async createTournament(
        @Body() dto: CreateTournamentDto, 
        @JWTBody() user: JwtPayload | null, 
        @Res() res: FastifyReply
    ) {}

    @Get('/:id')
    async getTournament(
        @Param('id') id: string, 
        @Res() res: FastifyReply
    ) {}

    @Post('/:id/join')
    @BodySchema(JoinTournamentSchema)
    async joinTournament(
        @Param('id') id: string,
        @Body() dto: JoinTournamentDto,
        @JWTBody() user: JwtPayload | null,
        @Res() res: FastifyReply
    ) {}

    @Post('/:id/start')
    @BodySchema(StartTournamentSchema)
    async startTournament(
        @Param('id') id: string,
        @Body() dto: StartTournamentDto,
        @JWTBody() user: JwtPayload | null,
        @Res() res: FastifyReply
    ) {}
}