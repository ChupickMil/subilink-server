import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class VerificationPhone {
    @ApiProperty()
    @IsNotEmpty()
    @IsPhoneNumber('RU', {
        message: 'Phone number is invalid',
    })
    phone: string;
}
