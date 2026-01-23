import { Controller, Inject } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { MailService } from './mail.service.js';

@Controller()
export class MailController {

	@Inject(MailService)
	private mailService!: MailService;

    @EventPattern('user_created')
    async handleUserCreated(@Payload() data: { email: string }) {
        console.log('Worker received task: Send mail to', data.email);
        await this.mailService.sendWelcomeEmail(data.email);
        console.log('Task completed.', data);
    }
}