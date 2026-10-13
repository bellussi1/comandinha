import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  ready(): Promise<boolean> {
    return this.prismaService.checkConnection();
  }
}
