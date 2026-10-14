import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../generated/prisma/client.js';

export class OrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus, enumName: 'OrderStatus' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class OrderTableSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class OrderItemResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  nameSnapshot!: string;

  @ApiProperty({ type: Number })
  unitPriceInCents!: number;

  @ApiProperty({ type: Number })
  quantity!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: Number })
  lineTotalInCents!: number;
}

export class OrderResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  tableId!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: Number })
  totalInCents!: number;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: OrderTableSummaryDto })
  table!: OrderTableSummaryDto;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];
}

export class OrderSummaryResponseDto {
  @ApiProperty({ type: Number, minimum: 0 })
  PENDING!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  PREPARING!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  READY!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  DELIVERED!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  CANCELLED!: number;
}
