import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class UpdateDescriptionDto {
    @ApiProperty()
    @IsString()
    description: string;
}
