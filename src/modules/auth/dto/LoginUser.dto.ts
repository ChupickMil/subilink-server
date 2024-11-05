import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsPhoneNumber, IsString, Length } from 'class-validator';

export class LoginUser {
    @ApiProperty()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    @IsPhoneNumber(undefined, { message: 'phone is invalid' })
    phone: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Length(6, 6, {
        message: 'Code must be 6 length',
    })
    code: string;

    // @ApiProperty()
    // @IsString()
    // @Length(8, 32, {
    //     message: 'Min 8, max 32',
    // })
    // password: string;
}
