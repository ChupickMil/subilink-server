import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class LoginUser {
    @ApiProperty()
    @IsPhoneNumber('RU', {
        message: 'Phone number is invalid',
    })
    phone: string;

    @ApiProperty()
    @IsString()
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
