import { Module } from 'my-fastify-decorators';
import { MailModule } from './mail/mail.module.js';

@Module({
    imports: [MailModule],
})
export class AppModule {}