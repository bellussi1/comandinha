import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import {
  DiningSessionsController,
  TablesController,
} from './tables.controller.js';
import { DiningSessionsService } from './dining-sessions.service.js';
import { TablesService } from './tables.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TablesController, DiningSessionsController],
  providers: [TablesService, DiningSessionsService],
})
export class TablesModule {}
