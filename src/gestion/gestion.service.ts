import { Service, InjectPlugin } from 'my-fastify-decorators';
import type { Server } from 'socket.io';
@Service()
export class GestionService {

    @InjectPlugin('io')
    private io!: Server;

    async getActiveSessions() {
        // Logic to retrieve active game sessions

        //this.io.of("/game/pong") => io = serv, of = namespace (socket path)
        const lists = await this.io.of("/game/pong").fetchSockets();

        const sessions = lists.map((socket) => {
            return {
                id: socket.id,
                username: socket.data.username || 'Unknown',
            };
        });

        return [
           sessions
        ];
    }
}
