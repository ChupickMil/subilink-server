import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString } from 'class-validator';

export class CheckCode {
    @ApiProperty()
    @IsPhoneNumber('RU', {
        message: 'Phone number is invalid',
    })
    phone: string;

    @ApiProperty()
    @IsString()
    code: string;
}
