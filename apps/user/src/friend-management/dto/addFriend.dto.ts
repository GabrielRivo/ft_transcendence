import { AdditionalProperties, generateSchema, IsInt, IsRequired, Maximum, Minimum } from "my-class-validator";


// @AdditionalProperties(false)
// export class AddFriendDto {
// 	@IsRequired({message : "Needed the id"})
// 	@IsInt()
// 	userId : number;

// 	@IsRequired({message : "Needed the other id"})
// 	@IsInt()
// 	otherId : number;
// }

// export const AddFriendSchema = generateSchema(AddFriendDto);

@AdditionalProperties(false)
export class FriendManagementDto {
	@IsRequired({message : "Needed the other id"})
	@IsInt()
	@Minimum(0)
	@Maximum(999999999) // 999 999 999 
	otherId : number;
}

export const FriendManagementSchema = generateSchema(FriendManagementDto);
