import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../generated/prisma/client.js';

const validateWhenProvided = (_object: unknown, value: unknown) =>
  value !== undefined;

export class CreatePublicOrderItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @ValidateIf(validateWhenProvided)
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreatePublicOrderDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  requestId!: string;

  @ApiProperty({ type: [CreatePublicOrderItemDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreatePublicOrderItemDto)
  items!: CreatePublicOrderItemDto[];

  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @ValidateIf(validateWhenProvided)
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class PublicMenuProductDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: Number })
  priceInCents!: number;

  @ApiProperty({ type: String, format: 'uri', nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ type: Boolean })
  featured!: boolean;

  @ApiProperty({ type: [String] })
  dietaryTags!: string[];

  @ApiProperty({ type: Number, nullable: true })
  prepTimeMinutes!: number | null;
}

export class PublicMenuCategoryDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: [PublicMenuProductDto] })
  products!: PublicMenuProductDto[];
}

export class PublicRestaurantSummaryDto {
  @ApiProperty({ type: String })
  name!: string;
}

export class PublicTableSummaryDto {
  @ApiProperty({ type: String })
  name!: string;
}

export class PublicDiningMenuDto {
  @ApiProperty({ type: PublicRestaurantSummaryDto })
  restaurant!: PublicRestaurantSummaryDto;

  @ApiProperty({ type: PublicTableSummaryDto })
  table!: PublicTableSummaryDto;

  @ApiProperty({ type: [PublicMenuCategoryDto] })
  categories!: PublicMenuCategoryDto[];
}

export class PublicOrderItemSnapshotDto {
  @ApiProperty({ type: String })
  nameSnapshot!: string;

  @ApiProperty({ type: Number })
  quantity!: number;

  @ApiProperty({ type: Number })
  unitPriceInCents!: number;

  @ApiProperty({ type: Number })
  lineTotalInCents!: number;
}

export class PublicOrderResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiProperty({ type: Number })
  totalInCents!: number;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: [PublicOrderItemSnapshotDto] })
  items!: PublicOrderItemSnapshotDto[];
}

export class PublicOrderSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiProperty({ type: Number })
  totalInCents!: number;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: [PublicOrderItemSnapshotDto] })
  items!: PublicOrderItemSnapshotDto[];
}
