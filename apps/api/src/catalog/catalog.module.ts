import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  CatalogCategoriesController,
  CatalogProductsController,
} from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CatalogCategoriesController, CatalogProductsController],
  providers: [CatalogService],
})
export class CatalogModule {}
