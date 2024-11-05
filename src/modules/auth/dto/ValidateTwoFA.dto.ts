import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class ValidateTwoFA {
    @ApiProperty()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    @IsPhoneNumber(undefined, { message: 'phone is invalid' })
    phone: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    token: string;
}
