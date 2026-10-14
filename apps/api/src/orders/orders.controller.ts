import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminSessionGuard } from '../auth/admin-session.guard.js';
import { CurrentAdmin } from '../auth/admin-principal.js';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import { OrderStatus } from '../generated/prisma/client.js';
import {
  OrderResponseDto,
  OrderSummaryResponseDto,
  OrdersQueryDto,
  UpdateOrderStatusDto,
} from './orders.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@ApiBearerAuth('admin-session')
@ApiUnauthorizedResponse({
  description: 'Sessão administrativa ausente ou inválida.',
})
@ApiBadRequestResponse({ description: 'Dados ou identificador inválidos.' })
@UseGuards(AdminSessionGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista até 100 pedidos mais recentes do restaurante da sessão',
  })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiOkResponse({ type: [OrderResponseDto] })
  list(
    @CurrentAdmin() principal: AdminPrincipal,
    @Query() query: OrdersQueryDto,
  ) {
    return this.ordersService.list(principal, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Conta pedidos por status no restaurante da sessão',
  })
  @ApiOkResponse({ type: OrderSummaryResponseDto })
  summary(@CurrentAdmin() principal: AdminPrincipal) {
    return this.ordersService.summary(principal);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um pedido do restaurante da sessão' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Pedido não encontrado.' })
  get(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.get(principal, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Avança ou cancela um pedido conforme o fluxo permitido',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Pedido não encontrado.' })
  @ApiConflictResponse({ description: 'Transição de status não permitida.' })
  updateStatus(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(principal, id, dto);
  }
}
