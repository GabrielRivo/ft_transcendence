import {
    ConnectedSocket,
    JWTBody,
    SubscribeConnection,
    SubscribeDisconnection,
    WebSocketGateway
} from 'my-fastify-decorators';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class UserGateway {
    @SubscribeConnection()
    async handleConnection(@ConnectedSocket() socket: Socket, @JWTBody() jwt: {id : number}) {
        // console.log('User connected', jwt);
        socket.data.userId = jwt.id;
    }

    @SubscribeDisconnection()
    async handleDisconnection(@ConnectedSocket() socket: Socket) {
        socket.data = {};
    }

}