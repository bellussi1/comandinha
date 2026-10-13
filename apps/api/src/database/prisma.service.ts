import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const localDatabaseUrl =
  'postgresql://comandinha:comandinha_local_only@127.0.0.1:5432/comandinha?schema=public';
const databaseTimeoutMillis = 2_000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL ?? localDatabaseUrl;

    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production.');
    }

    super({
      adapter: new PrismaPg({
        connectionString,
        connectionTimeoutMillis: databaseTimeoutMillis,
        query_timeout: databaseTimeoutMillis,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn(
        `Database connection is unavailable; readiness will report not-ready. ${String(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
