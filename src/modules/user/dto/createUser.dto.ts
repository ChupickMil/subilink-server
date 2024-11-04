import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class CreateUserDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsPhoneNumber('RU', {
        message: 'Phone number is invalid',
    })
    phone: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name?: string | null;
}
