import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import type { OrdersQueryDto, UpdateOrderStatusDto } from './orders.dto.js';
import type { CreatePublicOrderDto } from '../public-dining/public-dining.dto.js';
import { canTransitionOrderStatus } from './order-status.js';

const allOrderStatuses = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];
const publicTableCodePattern = /^[A-Za-z0-9_-]{43}$/;
const maximumIntegerCents = 2_147_483_647;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  list(principal: AdminPrincipal, query: OrdersQueryDto) {
    return this.prisma.order.findMany({
      where: {
        restaurantId: principal.restaurantId,
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        table: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            nameSnapshot: true,
            unitPriceInCents: true,
            quantity: true,
            notes: true,
            lineTotalInCents: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async summary(principal: AdminPrincipal) {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: { restaurantId: principal.restaurantId },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      allOrderStatuses.map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;
    for (const { status, _count } of grouped) {
      counts[status] =
        typeof _count === 'object' && _count !== null ? (_count._all ?? 0) : 0;
    }
    return counts;
  }

  async get(principal: AdminPrincipal, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId: principal.restaurantId },
      include: {
        table: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            nameSnapshot: true,
            unitPriceInCents: true,
            quantity: true,
            notes: true,
            lineTotalInCents: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async updateStatus(
    principal: AdminPrincipal,
    id: string,
    dto: UpdateOrderStatusDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.order.findFirst({
        where: { id, restaurantId: principal.restaurantId },
        select: { status: true },
      });
      if (!current) throw new NotFoundException('Order not found.');
      if (!canTransitionOrderStatus(current.status, dto.status)) {
        throw new ConflictException(
          'This order status transition is not allowed.',
        );
      }

      const updated = await transaction.order.updateMany({
        where: {
          id,
          restaurantId: principal.restaurantId,
          status: current.status,
        },
        data: { status: dto.status },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'The order status changed before this update.',
        );
      }

      const order = await transaction.order.findFirst({
        where: { id, restaurantId: principal.restaurantId },
        include: {
          table: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              nameSnapshot: true,
              unitPriceInCents: true,
              quantity: true,
              notes: true,
              lineTotalInCents: true,
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      });
      if (!order) throw new NotFoundException('Order not found.');
      return order;
    });
  }

  async createPublicOrder(publicCode: string, dto: CreatePublicOrderDto) {
    if (!publicTableCodePattern.test(publicCode)) {
      throw new NotFoundException('Table not found.');
    }

    return this.prisma.$transaction(async (transaction) => {
      const table = await transaction.restaurantTable.findFirst({
        where: { publicCode, isActive: true },
        select: { id: true, restaurantId: true },
      });
      if (!table) throw new NotFoundException('Table not found.');
      if (
        !Array.isArray(dto.items) ||
        dto.items.length < 1 ||
        dto.items.length > 50
      ) {
        throw new BadRequestException('An order must contain 1 to 50 items.');
      }
      if (dto.notes !== undefined && dto.notes.length > 200) {
        throw new BadRequestException(
          'Order notes must be at most 200 characters.',
        );
      }

      const productIds = dto.items.map(({ productId }) => productId);
      if (new Set(productIds).size !== productIds.length) {
        throw new BadRequestException('Duplicate products are not allowed.');
      }
      for (const item of dto.items) {
        if (
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 20 ||
          (item.notes !== undefined && item.notes.length > 200)
        ) {
          throw new BadRequestException('Order item details are invalid.');
        }
      }

      const products = await transaction.catalogProduct.findMany({
        where: {
          restaurantId: table.restaurantId,
          id: { in: productIds },
        },
        select: {
          id: true,
          name: true,
          priceInCents: true,
          available: true,
          isActive: true,
        },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products are invalid.');
      }
      if (products.some(({ isActive, available }) => !isActive || !available)) {
        throw new ConflictException('One or more products are unavailable.');
      }

      const productById = new Map(
        products.map((product) => [product.id, product]),
      );
      const items = dto.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product || product.priceInCents < 1) {
          throw new BadRequestException('One or more products are invalid.');
        }
        const lineTotalInCents = product.priceInCents * item.quantity;
        if (
          !Number.isSafeInteger(lineTotalInCents) ||
          lineTotalInCents > maximumIntegerCents
        ) {
          throw new BadRequestException('An order item total is too large.');
        }
        return {
          productId: product.id,
          nameSnapshot: product.name,
          unitPriceInCents: product.priceInCents,
          quantity: item.quantity,
          notes: item.notes,
          lineTotalInCents,
        };
      });
      const totalInCents = items.reduce(
        (total, item) => total + item.lineTotalInCents,
        0,
      );
      if (
        !Number.isSafeInteger(totalInCents) ||
        totalInCents > maximumIntegerCents
      ) {
        throw new BadRequestException('The order total is too large.');
      }

      const order = await transaction.order.create({
        data: {
          restaurantId: table.restaurantId,
          tableId: table.id,
          status: OrderStatus.PENDING,
          notes: dto.notes,
          totalInCents,
        },
      });
      await transaction.orderItem.createMany({
        data: items.map((item) => ({
          ...item,
          restaurantId: table.restaurantId,
          orderId: order.id,
        })),
      });

      return {
        id: order.id,
        status: order.status,
        totalInCents: order.totalInCents,
        createdAt: order.createdAt,
        items: items.map(
          ({ nameSnapshot, quantity, unitPriceInCents, lineTotalInCents }) => ({
            nameSnapshot,
            quantity,
            unitPriceInCents,
            lineTotalInCents,
          }),
        ),
      };
    });
  }

  async listPublicOrderSummaries(publicCode: string) {
    if (!publicTableCodePattern.test(publicCode)) {
      throw new NotFoundException('Table not found.');
    }
    const table = await this.prisma.restaurantTable.findFirst({
      where: { publicCode, isActive: true },
      select: { id: true, restaurantId: true },
    });
    if (!table) throw new NotFoundException('Table not found.');

    return this.prisma.order.findMany({
      where: { restaurantId: table.restaurantId, tableId: table.id },
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        totalInCents: true,
        createdAt: true,
        items: {
          select: {
            nameSnapshot: true,
            quantity: true,
            unitPriceInCents: true,
            lineTotalInCents: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }
}
