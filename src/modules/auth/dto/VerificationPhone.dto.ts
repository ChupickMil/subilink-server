import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class VerificationPhoneDto {
    @ApiProperty()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
    @IsPhoneNumber(undefined, { message: 'phone is invalid' })
    phone: string;
}
