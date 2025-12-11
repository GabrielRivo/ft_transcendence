import { Service } from 'my-fastify-decorators';

@Service()
export class GameService {
    
    processGameUpdate(data: any) {
        console.log('Processing game update:', data);
    }
}
