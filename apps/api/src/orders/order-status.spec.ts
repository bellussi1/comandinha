import { describe, expect, it } from 'vitest';
import { OrderStatus } from '../generated/prisma/client.js';
import { canTransitionOrderStatus } from './order-status.js';

const allowed: Array<[OrderStatus, OrderStatus]> = [
  [OrderStatus.PENDING, OrderStatus.PREPARING],
  [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING, OrderStatus.READY],
  [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.READY, OrderStatus.DELIVERED],
];

describe('canTransitionOrderStatus', () => {
  it.each(allowed)('allows %s → %s', (current, next) => {
    expect(canTransitionOrderStatus(current, next)).toBe(true);
  });

  it.each(
    Object.values(OrderStatus).flatMap((current) =>
      Object.values(OrderStatus)
        .filter(
          (next) =>
            !allowed.some(([from, to]) => from === current && to === next),
        )
        .map((next) => [current, next] as const),
    ),
  )('rejects %s → %s', (current, next) => {
    expect(canTransitionOrderStatus(current, next)).toBe(false);
  });
});
