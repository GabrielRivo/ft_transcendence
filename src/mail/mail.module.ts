import { Module } from 'my-fastify-decorators';
import { MailController } from './mail.consumer.js';
import { MailService } from './mail.service.js';

@Module({
    controllers: [MailController],
    providers: [MailService]
})
export class MailModule {}