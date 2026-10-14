import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import type { PrismaService } from '../database/prisma.service.js';
import { OrderStatus } from '../generated/prisma/client.js';
import type { OrdersQueryDto, UpdateOrderStatusDto } from './orders.dto.js';
import type { CreatePublicOrderDto } from '../public-dining/public-dining.dto.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService.list', () => {
  it('bounds each admin order query to the 100 most recent matches', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { order: { findMany } } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await service.list(
      { restaurantId: 'restaurant-id' } as AdminPrincipal,
      {} as OrdersQueryDto,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});

describe('OrdersService.getPublicOrderSummary', () => {
  it('scopes the order lookup to the active table from the QR code', async () => {
    const summary = {
      id: 'order-id',
      status: OrderStatus.PENDING,
      totalInCents: 1200,
      createdAt: new Date('2026-10-14T00:00:00.000Z'),
      items: [],
    };
    const findFirst = vi.fn().mockResolvedValue(summary);
    const prisma = {
      restaurantTable: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'table-id',
          restaurantId: 'restaurant-id',
        }),
      },
      order: { findFirst },
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await expect(
      service.getPublicOrderSummary('A'.repeat(43), 'order-id'),
    ).resolves.toEqual(summary);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'order-id',
          restaurantId: 'restaurant-id',
          tableId: 'table-id',
        },
      }),
    );
  });
});

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

describe('OrdersService.createPublicOrder', () => {
  it('returns a previously created order for the same table request key', async () => {
    const existing = {
      id: 'order-existing',
      status: OrderStatus.PENDING,
      totalInCents: 1200,
      createdAt: new Date('2026-10-14T00:00:00.000Z'),
      items: [
        {
          nameSnapshot: 'Smash clássico',
          quantity: 1,
          unitPriceInCents: 1200,
          lineTotalInCents: 1200,
        },
      ],
    };
    const transaction = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'table-id', isActive: true }]),
      restaurantTable: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'table-id',
          restaurantId: 'restaurant-id',
          isActive: true,
        }),
      },
      order: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
      catalogProduct: { findMany: vi.fn() },
      orderItem: { createMany: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);
    const dto = {
      requestId: '8d6ac078-e3f7-49b2-a5ef-3cb0710fa08e',
      items: [{ productId: 'product-id', quantity: 1 }],
    } as CreatePublicOrderDto;

    await expect(
      service.createPublicOrder('A'.repeat(43), dto),
    ).resolves.toMatchObject({
      id: existing.id,
      totalInCents: 1200,
      items: [{ nameSnapshot: 'Smash clássico' }],
    });

    expect(transaction.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tableId: 'table-id',
          idempotencyKey: dto.requestId,
        },
      }),
    );
    expect(transaction.catalogProduct.findMany).not.toHaveBeenCalled();
    expect(transaction.order.create).not.toHaveBeenCalled();
  });

  it('recovers the winning order when a concurrent insert hits the unique key', async () => {
    const existing = {
      id: 'order-winner',
      status: OrderStatus.PENDING,
      totalInCents: 1200,
      createdAt: new Date('2026-10-14T00:00:00.000Z'),
      items: [
        {
          nameSnapshot: 'Smash clássico',
          quantity: 1,
          unitPriceInCents: 1200,
          lineTotalInCents: 1200,
        },
      ],
    };
    const transaction = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'table-id', isActive: true }]),
      restaurantTable: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'table-id',
          restaurantId: 'restaurant-id',
          isActive: true,
        }),
      },
      order: {
        findFirst: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn().mockRejectedValue(new Error('unique key conflict')),
      },
      catalogProduct: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'product-id',
            name: 'Smash clássico',
            priceInCents: 1200,
            available: true,
            isActive: true,
          },
        ]),
      },
      diningSession: {
        findFirst: vi.fn().mockResolvedValue({ id: 'session-id' }),
      },
      orderItem: { createMany: vi.fn() },
    };
    const findExistingOrder = vi.fn().mockResolvedValue(existing);
    const prisma = {
      $transaction: vi.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      order: { findFirst: findExistingOrder },
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await expect(
      service.createPublicOrder('A'.repeat(43), {
        requestId: '8d6ac078-e3f7-49b2-a5ef-3cb0710fa08e',
        items: [{ productId: 'product-id', quantity: 1 }],
      }),
    ).resolves.toMatchObject({ id: 'order-winner' });
    expect(findExistingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tableId: 'table-id',
          idempotencyKey: '8d6ac078-e3f7-49b2-a5ef-3cb0710fa08e',
        },
      }),
    );
  });
});
