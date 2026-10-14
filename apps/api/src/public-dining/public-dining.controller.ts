import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerGetTrackerFunction } from '@nestjs/throttler';
import { GatewaySecretGuard } from '../auth/gateway-secret.guard.js';
import { OrdersService } from '../orders/orders.service.js';
import {
  CreatePublicOrderDto,
  PublicDiningMenuDto,
  PublicOrderResponseDto,
  PublicOrderSummaryDto,
} from './public-dining.dto.js';
import { PublicDiningService } from './public-dining.service.js';

const sourceKeyPattern = /^[a-f0-9]{64}$/;

const getPublicOrderTracker: ThrottlerGetTrackerFunction = (request) => {
  const headers = request.headers as Record<string, unknown> | undefined;
  const clientKey = headers?.['x-comandinha-client-key'];
  if (typeof clientKey === 'string' && sourceKeyPattern.test(clientKey)) {
    return `client:${clientKey}`;
  }

  if (process.env.NODE_ENV !== 'production') {
    const ip = typeof request.ip === 'string' ? request.ip : undefined;
    const socket = request.socket as { remoteAddress?: string } | undefined;
    return `ip:${ip ?? socket?.remoteAddress ?? 'unknown'}`;
  }

  return 'client:missing';
};

@ApiTags('public dining')
@Controller('public/tables/:code')
export class PublicDiningController {
  constructor(
    private readonly publicDiningService: PublicDiningService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('menu')
  @ApiOperation({ summary: 'Consulta o cardápio público de uma mesa ativa' })
  @ApiParam({
    name: 'code',
    type: String,
    description: 'Código de mesa base64url com 43 caracteres.',
  })
  @ApiOkResponse({ type: PublicDiningMenuDto })
  @ApiNotFoundResponse({ description: 'Mesa não encontrada.' })
  getMenu(@Param('code') code: string) {
    return this.publicDiningService.getMenu(code);
  }

  @Post('orders')
  @UseGuards(GatewaySecretGuard, ThrottlerGuard)
  @SkipThrottle({ account: true, source: true })
  @Throttle({
    publicOrder: { limit: 10, ttl: 60_000, getTracker: getPublicOrderTracker },
  })
  @ApiOperation({
    summary: 'Cria um pedido público usando o preço atual do cardápio',
  })
  @ApiParam({
    name: 'code',
    type: String,
    description: 'Código de mesa base64url com 43 caracteres.',
  })
  @ApiHeader({ name: 'x-comandinha-gateway-secret', required: true })
  @ApiHeader({
    name: 'x-comandinha-client-key',
    required: false,
    description: 'Hash SHA-256 da origem confiável encaminhado pelo BFF.',
  })
  @ApiBody({ type: CreatePublicOrderDto })
  @ApiCreatedResponse({ type: PublicOrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Itens, quantidades ou observações inválidas.',
  })
  @ApiNotFoundResponse({ description: 'Mesa não encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Gateway não autorizado.' })
  @ApiTooManyRequestsResponse({ description: 'Limite de pedidos excedido.' })
  createOrder(@Param('code') code: string, @Body() dto: CreatePublicOrderDto) {
    return this.ordersService.createPublicOrder(code, dto);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Lista os pedidos recentes desta mesa sem dados pessoais',
  })
  @ApiParam({
    name: 'code',
    type: String,
    description: 'Código de mesa base64url com 43 caracteres.',
  })
  @ApiOkResponse({ type: [PublicOrderSummaryDto] })
  @ApiNotFoundResponse({ description: 'Mesa não encontrada.' })
  listOrders(@Param('code') code: string) {
    return this.ordersService.listPublicOrderSummaries(code);
  }

  @Get('orders/:orderId')
  @ApiOperation({
    summary: 'Acompanha um pedido específico desta mesa sem dados pessoais',
  })
  @ApiParam({
    name: 'code',
    type: String,
    description: 'Código de mesa base64url com 43 caracteres.',
  })
  @ApiParam({ name: 'orderId', type: String, format: 'uuid' })
  @ApiOkResponse({ type: PublicOrderSummaryDto })
  @ApiBadRequestResponse({ description: 'O identificador do pedido é inválido.' })
  @ApiNotFoundResponse({ description: 'Mesa ou pedido não encontrado.' })
  getOrder(
    @Param('code') code: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.getPublicOrderSummary(code, orderId);
  }
}
