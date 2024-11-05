import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class RegisterUser {
    @ApiProperty()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    @IsPhoneNumber(undefined, { message: 'phone is invalid' })
    phone: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    // @ApiProperty()
    // @IsNotEmpty()
    // @IsString()
    // @Length(8, 32, {
    //     message: 'Min 8, max 32',
    // })
    // password: string;
}
