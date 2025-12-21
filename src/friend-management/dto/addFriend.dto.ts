import { AdditionalProperties, generateSchema, IsEmail, IsInt, IsRequired } from "my-class-validator";



@AdditionalProperties(false)
export class AddFriendDto {
	@IsRequired()
	@IsInt()
	userId : number;

	@IsRequired({message : "C requit encullleeeee!"})
	@IsInt()
	otherId : number;
}

// interface AddFriendInterface {
// 	userId : number;
// 	otherId : number;
// }


export const AddFriendSchema = generateSchema(AddFriendDto);