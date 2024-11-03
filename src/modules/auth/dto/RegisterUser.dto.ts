import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class RegisterUser {
    @ApiProperty()
    @IsNotEmpty()
    @IsPhoneNumber('RU', {
        message: 'Phone number is invalid',
    })
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
