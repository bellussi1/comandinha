import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const validateWhenProvided = (_object: unknown, value: unknown) =>
  value !== undefined;

export class CreateTableDto {
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 80,
    example: 'Mesa 01',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class UpdateTableDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 80 })
  @ValidateIf(validateWhenProvided)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf(validateWhenProvided)
  @IsBoolean()
  isActive?: boolean;
}

export class TableResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, minLength: 43, maxLength: 43 })
  publicCode!: string;

  @ApiProperty({ type: Boolean })
  isActive!: boolean;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: Number, minimum: 0 })
  activeOrderCount!: number;
}
