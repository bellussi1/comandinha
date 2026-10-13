import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
