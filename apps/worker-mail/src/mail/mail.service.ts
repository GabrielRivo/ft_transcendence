import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Resend } from 'resend';

@Service()
export class MailService {
	@InjectPlugin('resend')
	private resend!: Resend;

	async sendOtpEmail(email: string, otp: string) {
		const { data, error } = await this.resend.emails.send({
			from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM}>`,
			to: [email],
			subject: 'Verification Code',
			html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset</h2>
                    <p>Hello,</p>
                    <p>You requested to reset your password. Here is your verification code:</p>
                    <h1 style="color: #000; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this, you can ignore this email.</p>
                </div>
            `,
		});

		if (error) {
			const err: any = new Error(error.message);
			err.statusCode = error.name === 'validation_error' ? 400 : 500;
			err.details = error;
			throw err;
		}
		return data;
	}
}
