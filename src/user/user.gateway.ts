import {
    ConnectedSocket,
    Inject,
    JWTBody,
    SubscribeConnection,
    SubscribeDisconnection,
    WebSocketGateway
} from 'my-fastify-decorators';
import { Socket } from 'socket.io';
import { UserService } from './user.service.js';

@WebSocketGateway()
export class UserGateway {
    @Inject(UserService)
    private userService!: UserService;

    @SubscribeConnection()
    async handleConnection(@ConnectedSocket() socket: Socket, @JWTBody() jwt: { id: number }) {
        try {
            const profile = await this.userService.get_profile(jwt.id);
            
            socket.data.userId = jwt.id;
            socket.data.username = profile.username;
            socket.data.avatar = profile.avatar;

            // Broadcast to all other clients that this user is online
            socket.broadcast.emit('user_online', {
                userId: jwt.id,
                username: profile.username,
                avatar: profile.avatar
            });
        } catch (error) {
            // If profile not found, still store userId but with empty username/avatar
            socket.data.userId = jwt.id;
            socket.data.username = '';
            socket.data.avatar = null;
            
            socket.broadcast.emit('user_online', {
                userId: jwt.id,
                username: '',
                avatar: null
            });
        }
    }

    @SubscribeDisconnection()
    async handleDisconnection(@ConnectedSocket() socket: Socket) {
        if (socket.data.userId) {
            socket.broadcast.emit('user_offline', { userId: socket.data.userId });
        }
        socket.data = {};
    }
}