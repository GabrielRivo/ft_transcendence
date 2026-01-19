import { IsNullable, IsString, generateSchema } from 'my-class-validator';

export class DisqualifyParticipantDto {
	/** Secret admin pour les tournois créés par un invité */
	@IsNullable(true)
	@IsString()
	adminSecret?: string;
}

export const DisqualifyParticipantSchema = generateSchema(DisqualifyParticipantDto);
