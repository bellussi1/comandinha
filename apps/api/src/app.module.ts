import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { TablesModule } from './tables/tables.module.js';

@Module({
  imports: [AuthModule, HealthModule, CatalogModule, TablesModule],
})
export class AppModule {}
