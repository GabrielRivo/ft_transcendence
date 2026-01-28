import { AdditionalProperties, generateSchema, IsInt, IsRequired} from "my-class-validator";


@AdditionalProperties(false)
export class AddMatchToHistoryDto {
	@IsRequired({message : "Id1 is requiered"})
	@IsInt()
	userId1 : number;

	@IsRequired({message : "Id2 is requiered"})
	@IsInt()
	userId2 : number;

	@IsRequired({message : "scoreUser1 is requiered"})
	@IsInt()
	scoreUser1 : number;

	@IsRequired({message : "scoreUser2 is requiered"})
	@IsInt()
	scoreUser2 : number;

}



export const AddMatchToHistorySchema = generateSchema(AddMatchToHistoryDto);