import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import type { PrismaService } from '../database/prisma.service.js';
import { OrderStatus } from '../generated/prisma/client.js';
import type { UpdateOrderStatusDto } from './orders.dto.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService.updateStatus', () => {
  it('rejects the update when another transaction changes the status first', async () => {
    const transaction = {
      order: {
        findFirst: vi.fn().mockResolvedValue({ status: OrderStatus.PENDING }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await expect(
      service.updateStatus(
        { restaurantId: 'restaurant-id' } as AdminPrincipal,
        'order-id',
        { status: OrderStatus.PREPARING } as UpdateOrderStatusDto,
      ),
    ).rejects.toThrow(
      new ConflictException('The order status changed before this update.'),
    );

    expect(transaction.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order-id',
        restaurantId: 'restaurant-id',
        status: OrderStatus.PENDING,
      },
      data: { status: OrderStatus.PREPARING },
    });
    expect(transaction.order.findFirst).toHaveBeenCalledTimes(1);
  });
});
