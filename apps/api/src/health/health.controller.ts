import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Verifica se a API está ativa' })
  @ApiOkResponse({
    description: 'A API está ativa.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok'], example: 'ok' },
      },
      required: ['status'],
    },
  })
  live(): { status: 'ok' } {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Verifica a disponibilidade da API e do banco de dados' })
  @ApiOkResponse({
    description: 'A API e o banco de dados estão disponíveis.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ready'], example: 'ready' },
      },
      required: ['status'],
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'O banco de dados não está disponível.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['not-ready'], example: 'not-ready' },
      },
      required: ['status'],
    },
  })
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ready' | 'not-ready' }> {
    const ready = await this.healthService.ready();
    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return { status: ready ? 'ready' : 'not-ready' };
  }
}
