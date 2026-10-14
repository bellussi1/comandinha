import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PublicDiningController } from './public-dining.controller.js';
import { PublicDiningService } from './public-dining.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule],
  controllers: [PublicDiningController],
  providers: [PublicDiningService],
})
export class PublicDiningModule {}
