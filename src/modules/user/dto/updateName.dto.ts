import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class UpdateNameDto {
    // @ApiProperty()
    // @IsNotEmpty()
    // @Transform(({ value }) => value.trim())
    // @IsPhoneNumber(undefined, { message: 'phone is invalid' })
    // phone: string;
    @ApiProperty()
    @IsString()
    name: string;
}
