import { AdditionalProperties, IsNullable, IsRequired, IsString, MaxLength, generateSchema } from "my-class-validator";

@AdditionalProperties(false)
export class UpdateProfileDto {
	@IsRequired({ message: "Bio is required" })
	@IsString()
	@MaxLength(500, { message: "Bio must be at most 500 characters" })
	bio: string;
}

export const UpdateProfileDtoSchema = generateSchema(UpdateProfileDto);

@AdditionalProperties(false)
export class UpdateProfileDtoResponse {
	@IsRequired()
	@IsString()
	message: string;
}

export const UpdateProfileDtoSchemaResponse = generateSchema(UpdateProfileDtoResponse);

@AdditionalProperties(false)
export class UploadAvatarDtoResponse {
	@IsRequired()
	@IsString()
	message: string;

	@IsRequired()
	@IsString()
	@IsNullable(true)
	avatarUrl: string | null;
}

export const UploadAvatarDtoSchemaResponse = generateSchema(UploadAvatarDtoResponse);

@AdditionalProperties(false)
export class DeleteAvatarDtoResponse {
	@IsRequired()
	@IsString()
	message: string;

	@IsRequired()
	@IsString()
	@IsNullable(true)
	avatarUrl: string | null;
}

export const DeleteAvatarDtoSchemaResponse = generateSchema(DeleteAvatarDtoResponse);
