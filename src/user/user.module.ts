import { Module } from 'my-fastify-decorators'
import { UserGateway } from './user.gateway.js'

@Module({
	gateways: [UserGateway],
	// providers: [UserService],
})
export class UserModule {}
