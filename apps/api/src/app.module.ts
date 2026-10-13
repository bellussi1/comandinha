import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { TablesModule } from './tables/tables.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PublicDiningModule } from './public-dining/public-dining.module.js';

@Module({
  imports: [
    AuthModule,
    HealthModule,
    CatalogModule,
    TablesModule,
    OrdersModule,
    PublicDiningModule,
  ],
})
export class AppModule {}
