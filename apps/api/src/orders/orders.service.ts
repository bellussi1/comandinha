import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import type { OrdersQueryDto, UpdateOrderStatusDto } from './orders.dto.js';
import { canTransitionOrderStatus } from './order-status.js';

const allOrderStatuses = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

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
}
