import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Server } from 'socket.io'

@Service()
export class SampleService {
  @InjectPlugin('io')
  private io!: Server;
  private interval: NodeJS.Timeout | undefined;

  OnModuleInit(){
    this.interval = setInterval(() => {
      this.getMatchMaking()
    }, 1000)
  }

  fetchUser() {
    this.io.fetchSockets()
    return;
  }

  getMatchMaking(){
      //...
      // emit a chaque user independameent avec il est...
  }

  OnModuleDesotry() {
    clearInterval(this.interval)
  }
}
