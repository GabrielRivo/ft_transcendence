import { AdditionalProperties, generateSchema, IsInt, IsRequired, IsString, MaxLength, MinLength } from "my-class-validator";

@AdditionalProperties(false)
export class CreateGroupDto {
	@IsRequired({ message: "Owner ID is required" })
	@IsInt()
	ownerId: number;

	@IsRequired({ message: "Group name is required" })
	@IsString()
	@MinLength(1)
	@MaxLength(50)
	name: string;
}

export const CreateGroupSchema = generateSchema(CreateGroupDto);

@AdditionalProperties(false)
export class GroupMemberDto {
	@IsRequired({ message: "Group ID is required" })
	@IsInt()
	groupId: number;

	@IsRequired({ message: "User ID is required" })
	@IsInt()
	userId: number;

	@IsRequired({ message: "Other ID is required" })
	@IsInt()
	otherId: number;
}

export const GroupMemberSchema = generateSchema(GroupMemberDto);

