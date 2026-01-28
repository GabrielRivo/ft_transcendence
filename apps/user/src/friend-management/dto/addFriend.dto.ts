import { AdditionalProperties, generateSchema, IsInt, IsRequired } from "my-class-validator";


@AdditionalProperties(false)
export class AddFriendDto {
	@IsRequired({message : "Needed the id"})
	@IsInt()
	userId : number;

	@IsRequired({message : "Needed the other id"})
	@IsInt()
	otherId : number;
}

export const AddFriendSchema = generateSchema(AddFriendDto);

@AdditionalProperties(false)
export class FriendManagementDto {
	@IsRequired({message : "Needed the other id"})
	@IsInt()
	otherId : number;
}

export const FriendManagementSchema = generateSchema(FriendManagementDto);
