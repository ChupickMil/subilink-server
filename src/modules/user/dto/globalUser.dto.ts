import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator'

export class GlobalUsers {
    @ApiProperty()
    @IsNotEmpty()
    @IsPhoneNumber(undefined, { message: 'phone is invalid' })
    id: number;

    @ApiProperty()
    @IsString()
    name: string;
}
