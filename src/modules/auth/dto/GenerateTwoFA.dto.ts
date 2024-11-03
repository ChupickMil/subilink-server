import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class GenerateTwoFA {
    @ApiProperty()
    @IsPhoneNumber('RU', {
        message: 'Phone number is invalid',
    })
    phone: string;
}
