import { Controller, Inject } from 'my-fastify-decorators';
import { Ctx, EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { MailService } from './mail.service.js';

@Controller()
export class MailController {

	@Inject(MailService)
	private mailService!: MailService;

    @EventPattern('send_otp')
    async handleSendOtp(@Payload() data: { mail: string; otp: string }, @Ctx() context: any) {
        try {
             await this.mailService.sendOtpEmail(data.mail, data.otp);
        } catch (error: any) {
            const isPermanent = error.statusCode && error.statusCode >= 400 && error.statusCode < 500;
            
            if (isPermanent) {
                return;
            }

            const channel = context.channel;
            const originalMessage = context.originalMessage;

            await channel.assertQueue('mail_queue_wait', {
                durable: true,
                deadLetterExchange: '',
                deadLetterRoutingKey: 'mail_queue',
                messageTtl: 60000
            });

            channel.sendToQueue('mail_queue_wait', originalMessage.content, {
                persistent: true
            });
        }
    }
}