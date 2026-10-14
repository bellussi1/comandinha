import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiningSessionStatus,
  OrderStatus,
} from '../generated/prisma/client.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import { PrismaService } from '../database/prisma.service.js';
import { assertCanManageTables } from './tables-access.js';

const sessionInclude = {
  orders: {
    select: {
      id: true,
      status: true,
      totalInCents: true,
      createdAt: true,
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
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.DiningSessionInclude;

type SessionWithOrders = Prisma.DiningSessionGetPayload<{
  include: typeof sessionInclude;
}>;

const nonTerminalStatuses: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

export async function lockDiningTable(
  transaction: Prisma.TransactionClient,
  restaurantId: string,
  tableId: string,
) {
  const [table] = await transaction.$queryRaw<
    Array<{ id: string; isActive: boolean }>
  >`
    SELECT "id", "isActive"
    FROM "RestaurantTable"
    WHERE "id" = ${tableId}::uuid AND "restaurantId" = ${restaurantId}::uuid
    FOR UPDATE
  `;
  if (!table) throw new NotFoundException('Table not found.');
  return table;
}

function toSessionResponse(session: SessionWithOrders) {
  const nonCancelledTotal = session.orders.reduce(
    (total, order) =>
      order.status === OrderStatus.CANCELLED
        ? total
        : total + order.totalInCents,
    0,
  );

  return {
    ...session,
    projectedTotalInCents: session.closedTotalInCents ?? nonCancelledTotal,
    nonTerminalOrderCount: session.orders.filter((order) =>
      nonTerminalStatuses.includes(order.status),
    ).length,
  };
}

@Injectable()
export class DiningSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async open(principal: AdminPrincipal, tableId: string) {
    assertCanManageTables(principal.role);

    return this.prisma.$transaction(async (transaction) => {
      const table = await lockDiningTable(
        transaction,
        principal.restaurantId,
        tableId,
      );
      if (!table.isActive) {
        throw new ConflictException('An inactive table cannot be opened.');
      }

      const currentSession = await transaction.diningSession.findFirst({
        where: {
          restaurantId: principal.restaurantId,
          tableId,
          status: DiningSessionStatus.OPEN,
        },
        include: sessionInclude,
      });
      if (currentSession) {
        return { created: false, session: toSessionResponse(currentSession) };
      }

      const session = await transaction.diningSession.create({
        data: {
          restaurantId: principal.restaurantId,
          tableId,
          status: DiningSessionStatus.OPEN,
        },
        include: sessionInclude,
      });
      return { created: true, session: toSessionResponse(session) };
    });
  }

  async getCurrent(principal: AdminPrincipal, tableId: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId: principal.restaurantId },
      select: { id: true },
    });
    if (!table) throw new NotFoundException('Table not found.');

    const session = await this.prisma.diningSession.findFirst({
      where: {
        restaurantId: principal.restaurantId,
        tableId,
        status: DiningSessionStatus.OPEN,
      },
      include: sessionInclude,
    });
    return { session: session ? toSessionResponse(session) : null };
  }

  async close(principal: AdminPrincipal, sessionId: string) {
    assertCanManageTables(principal.role);

    return this.prisma.$transaction(async (transaction) => {
      const reference = await transaction.diningSession.findFirst({
        where: { id: sessionId, restaurantId: principal.restaurantId },
        select: { tableId: true },
      });
      if (!reference) throw new NotFoundException('Dining session not found.');

      await lockDiningTable(
        transaction,
        principal.restaurantId,
        reference.tableId,
      );

      const session = await transaction.diningSession.findFirst({
        where: { id: sessionId, restaurantId: principal.restaurantId },
        include: sessionInclude,
      });
      if (!session) throw new NotFoundException('Dining session not found.');
      if (session.status === DiningSessionStatus.CLOSED) {
        return toSessionResponse(session);
      }

      const nonTerminalOrderCount = session.orders.filter((order) =>
        nonTerminalStatuses.includes(order.status),
      ).length;
      if (nonTerminalOrderCount > 0) {
        throw new ConflictException(
          'All orders must be delivered or cancelled before closing this table.',
        );
      }

      const deliveredTotal = await transaction.order.aggregate({
        where: {
          restaurantId: principal.restaurantId,
          tableId: reference.tableId,
          diningSessionId: sessionId,
          status: OrderStatus.DELIVERED,
        },
        _sum: { totalInCents: true },
      });
      const closedTotalInCents = deliveredTotal._sum.totalInCents ?? 0;
      if (closedTotalInCents < 0) {
        throw new ConflictException('The session total is invalid.');
      }

      const closedAt = new Date();
      const updated = await transaction.diningSession.updateMany({
        where: {
          id: sessionId,
          restaurantId: principal.restaurantId,
          status: DiningSessionStatus.OPEN,
        },
        data: {
          status: DiningSessionStatus.CLOSED,
          closedAt,
          closedTotalInCents,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('The session changed before it closed.');
      }

      const closedSession = await transaction.diningSession.findFirst({
        where: { id: sessionId, restaurantId: principal.restaurantId },
        include: sessionInclude,
      });
      if (!closedSession)
        throw new NotFoundException('Dining session not found.');
      return toSessionResponse(closedSession);
    });
  }

  async currentSummaries(restaurantId: string, tableIds: string[]) {
    const summaries = new Map<
      string,
      {
        id: string;
        openedAt: Date;
        projectedTotalInCents: number;
        nonTerminalOrderCount: number;
      }
    >();
    if (tableIds.length === 0) return summaries;

    const sessions = await this.prisma.diningSession.findMany({
      where: {
        restaurantId,
        tableId: { in: tableIds },
        status: DiningSessionStatus.OPEN,
      },
      select: { id: true, tableId: true, openedAt: true },
    });
    if (sessions.length === 0) return summaries;

    const groupedOrders = await this.prisma.order.groupBy({
      by: ['diningSessionId', 'status'],
      where: {
        restaurantId,
        diningSessionId: { in: sessions.map(({ id }) => id) },
      },
      _count: { _all: true },
      _sum: { totalInCents: true },
    });
    const summaryBySession = new Map<
      string,
      { projectedTotalInCents: number; nonTerminalOrderCount: number }
    >();

    for (const group of groupedOrders) {
      if (!group.diningSessionId) continue;
      const summary = summaryBySession.get(group.diningSessionId) ?? {
        projectedTotalInCents: 0,
        nonTerminalOrderCount: 0,
      };
      if (group.status !== OrderStatus.CANCELLED) {
        summary.projectedTotalInCents += group._sum.totalInCents ?? 0;
      }
      if (nonTerminalStatuses.includes(group.status)) {
        summary.nonTerminalOrderCount += group._count._all;
      }
      summaryBySession.set(group.diningSessionId, summary);
    }

    for (const session of sessions) {
      summaries.set(session.tableId, {
        id: session.id,
        openedAt: session.openedAt,
        ...(summaryBySession.get(session.id) ?? {
          projectedTotalInCents: 0,
          nonTerminalOrderCount: 0,
        }),
      });
    }
    return summaries;
  }
}
