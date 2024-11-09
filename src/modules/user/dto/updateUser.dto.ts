import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    @IsPhoneNumber(undefined, { message: 'phone is invalid' })
    phone: string;

    @ApiProperty()
    @IsString()
    name: string;
}
