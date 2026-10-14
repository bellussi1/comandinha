import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DiningSessionStatus,
  OrderStatus,
} from '../generated/prisma/client.js';

export class DiningSessionOrderItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  nameSnapshot!: string;

  @ApiProperty({ type: Number, minimum: 0 })
  unitPriceInCents!: number;

  @ApiProperty({ type: Number, minimum: 1 })
  quantity!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: Number, minimum: 0 })
  lineTotalInCents!: number;
}

export class DiningSessionOrderDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiProperty({ type: Number, minimum: 0 })
  totalInCents!: number;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: [DiningSessionOrderItemDto] })
  items!: DiningSessionOrderItemDto[];
}

export class DiningSessionResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  tableId!: string;

  @ApiProperty({ enum: DiningSessionStatus, enumName: 'DiningSessionStatus' })
  status!: DiningSessionStatus;

  @ApiProperty({ type: Date, format: 'date-time' })
  openedAt!: Date;

  @ApiPropertyOptional({ type: Date, format: 'date-time', nullable: true })
  closedAt!: Date | null;

  @ApiPropertyOptional({ type: Number, minimum: 0, nullable: true })
  closedTotalInCents!: number | null;

  @ApiProperty({ type: Number, minimum: 0 })
  projectedTotalInCents!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  nonTerminalOrderCount!: number;

  @ApiProperty({ type: [DiningSessionOrderDto] })
  orders!: DiningSessionOrderDto[];
}

export class DiningSessionEnvelopeDto {
  @ApiPropertyOptional({ type: DiningSessionResponseDto, nullable: true })
  session!: DiningSessionResponseDto | null;
}

export class TableCurrentSessionDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  openedAt!: Date;

  @ApiProperty({ type: Number, minimum: 0 })
  projectedTotalInCents!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  nonTerminalOrderCount!: number;
}
