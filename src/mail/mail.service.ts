import { Service } from 'my-fastify-decorators';

@Service()
export class MailService {
    sendWelcomeEmail(email: string) {
        console.log(`📧 [EMAIL SENT] Welcome to ${email} !`);
        return new Promise(resolve => setTimeout(resolve, 500));
    }
}