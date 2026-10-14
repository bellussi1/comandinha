import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const validateWhenProvided = (_object: unknown, value: unknown) =>
  value !== undefined;

export class CreateCatalogCategoryDto {
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 120,
    example: 'Bebidas',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ type: String, maxLength: 2_000 })
  @ValidateIf(validateWhenProvided)
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({
    maxLength: 2_048,
    type: String,
    format: 'uri',
    example: 'https://example.com/menu.jpg',
  })
  @ValidateIf(validateWhenProvided)
  @IsString()
  @MaxLength(2_048)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  imageUrl?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 2_147_483_647,
    description: 'Ordem da categoria. O valor padrão é zero.',
  })
  @ValidateIf(validateWhenProvided)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  displayOrder?: number;
}

export class UpdateCatalogCategoryDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 120 })
  @ValidateIf(validateWhenProvided)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 2_000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    maxLength: 2_048,
    format: 'uri',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_048)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  imageUrl?: string | null;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 2_147_483_647,
  })
  @ValidateIf(validateWhenProvided)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  displayOrder?: number;
}

export class CreateCatalogProductDto {
  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 120,
    example: 'Suco de laranja',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ type: String, maxLength: 2_000 })
  @ValidateIf(validateWhenProvided)
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: 2_147_483_647,
    description: 'Preço em centavos inteiros.',
  })
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  priceInCents!: number;

  @ApiPropertyOptional({
    type: String,
    maxLength: 2_048,
    format: 'uri',
  })
  @ValidateIf(validateWhenProvided)
  @IsString()
  @MaxLength(2_048)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  imageUrl?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Disponível para pedidos. O valor padrão é true.',
  })
  @ValidateIf(validateWhenProvided)
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Destaque no catálogo. O valor padrão é false.',
  })
  @ValidateIf(validateWhenProvided)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ type: [String], maxItems: 20, maxLength: 60 })
  @ValidateIf(validateWhenProvided)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  dietaryTags?: string[];

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 1_440,
  })
  @ValidateIf(validateWhenProvided)
  @IsInt()
  @Min(1)
  @Max(1_440)
  prepTimeMinutes?: number;
}

export class UpdateCatalogProductDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 120 })
  @ValidateIf(validateWhenProvided)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 2_000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @ValidateIf(validateWhenProvided)
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 2_147_483_647,
    type: Number,
    description: 'Preço em centavos inteiros.',
  })
  @ValidateIf(validateWhenProvided)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  priceInCents?: number;

  @ApiPropertyOptional({
    type: String,
    maxLength: 2_048,
    format: 'uri',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_048)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  imageUrl?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf(validateWhenProvided)
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf(validateWhenProvided)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ type: [String], maxItems: 20, maxLength: 60 })
  @ValidateIf(validateWhenProvided)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  dietaryTags?: string[];

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 1_440,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_440)
  prepTimeMinutes?: number | null;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Permite restaurar um produto arquivado.',
  })
  @ValidateIf(validateWhenProvided)
  @IsBoolean()
  isActive?: boolean;
}

export class CatalogProductQueryDto {
  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeArchived?: boolean;
}

export class CatalogCategoryResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  nameNormalized!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uri', nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ type: Number })
  displayOrder!: number;

  @ApiProperty({ type: Number })
  productCount!: number;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  updatedAt!: Date;
}

export class CatalogProductResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: Number, description: 'Preço em centavos inteiros.' })
  priceInCents!: number;

  @ApiPropertyOptional({ type: String, format: 'uri', nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ type: Boolean })
  available!: boolean;

  @ApiProperty({ type: Boolean })
  featured!: boolean;

  @ApiProperty({ type: [String] })
  dietaryTags!: string[];

  @ApiPropertyOptional({ type: Number, nullable: true })
  prepTimeMinutes!: number | null;

  @ApiProperty({ type: Boolean })
  isActive!: boolean;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  updatedAt!: Date;
}
