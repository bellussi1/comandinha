import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TablesController } from './tables.controller.js';
import { TablesService } from './tables.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}
