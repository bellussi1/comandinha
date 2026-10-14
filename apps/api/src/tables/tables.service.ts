import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { OrderStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import { assertCanManageTables } from './tables-access.js';
import type { CreateTableDto, UpdateTableDto } from './tables.dto.js';

const activeOrderStatuses = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(principal: AdminPrincipal) {
    const tables = await this.prisma.restaurantTable.findMany({
      where: { restaurantId: principal.restaurantId },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });
    return this.withActiveOrderCounts(principal.restaurantId, tables);
  }

  async get(principal: AdminPrincipal, id: string) {
    const table = await this.findTable(principal, id);
    const [result] = await this.withActiveOrderCounts(principal.restaurantId, [
      table,
    ]);
    return result;
  }

  async create(principal: AdminPrincipal, dto: CreateTableDto) {
    assertCanManageTables(principal.role);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Table name cannot be empty.');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const table = await this.prisma.restaurantTable.create({
          data: {
            restaurantId: principal.restaurantId,
            name,
            publicCode: randomBytes(32).toString('base64url'),
          },
        });
        return { ...table, activeOrderCount: 0 };
      } catch (error) {
        if (!this.hasPrismaCode(error, 'P2002')) throw error;
        if (this.isPublicCodeCollision(error) && attempt < 2) continue;
        if (!this.hasUniqueTarget(error) && attempt < 2) continue;
        throw new ConflictException('A table with this name already exists.');
      }
    }

    throw new ConflictException(
      'Could not generate a unique public table code.',
    );
  }

  async update(principal: AdminPrincipal, id: string, dto: UpdateTableDto) {
    assertCanManageTables(principal.role);
    if (dto.name === undefined && dto.isActive === undefined) {
      throw new BadRequestException(
        'At least one table field must be provided.',
      );
    }

    const data = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
    if (data.name === '')
      throw new BadRequestException('Table name cannot be empty.');

    try {
      const result = await this.prisma.restaurantTable.updateMany({
        where: { id, restaurantId: principal.restaurantId },
        data,
      });
      if (result.count !== 1) throw new NotFoundException('Table not found.');
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A table with this name already exists.');
      }
      throw error;
    }

    return this.get(principal, id);
  }

  private async findTable(principal: AdminPrincipal, id: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: {
        id,
        restaurantId: principal.restaurantId,
      },
    });
    if (!table) throw new NotFoundException('Table not found.');
    return table;
  }

  private async withActiveOrderCounts(
    restaurantId: string,
    tables: Awaited<ReturnType<PrismaService['restaurantTable']['findMany']>>,
  ) {
    if (tables.length === 0) return [];
    const counts = await this.prisma.order.groupBy({
      by: ['tableId'],
      where: {
        restaurantId,
        tableId: { in: tables.map(({ id }) => id) },
        status: { in: activeOrderStatuses },
      },
      _count: { _all: true },
    });
    const countByTableId = new Map<string, number>();
    for (const { tableId, _count } of counts) {
      const count =
        typeof _count === 'object' && _count !== null ? (_count._all ?? 0) : 0;
      countByTableId.set(tableId, count);
    }
    return tables.map((table) => ({
      ...table,
      activeOrderCount: countByTableId.get(table.id) ?? 0,
    }));
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }

  private hasUniqueTarget(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('meta' in error)) {
      return false;
    }
    const meta = error.meta;
    if (typeof meta !== 'object' || meta === null || !('target' in meta)) {
      return false;
    }
    return meta.target !== undefined && meta.target !== null;
  }

  private isPublicCodeCollision(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('meta' in error)) {
      return false;
    }
    const meta = error.meta;
    if (typeof meta !== 'object' || meta === null || !('target' in meta)) {
      return false;
    }
    const target = meta.target;
    return Array.isArray(target)
      ? target.includes('publicCode')
      : typeof target === 'string' && target.includes('publicCode');
  }
}
