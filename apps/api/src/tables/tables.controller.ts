import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminSessionGuard } from '../auth/admin-session.guard.js';
import { CurrentAdmin } from '../auth/admin-principal.js';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import {
  DiningSessionEnvelopeDto,
  DiningSessionResponseDto,
} from './dining-sessions.dto.js';
import { DiningSessionsService } from './dining-sessions.service.js';
import {
  CreateTableDto,
  TableResponseDto,
  UpdateTableDto,
} from './tables.dto.js';
import { TablesService } from './tables.service.js';

@ApiTags('tables')
@ApiBearerAuth('admin-session')
@ApiUnauthorizedResponse({
  description: 'Sessão administrativa ausente ou inválida.',
})
@ApiBadRequestResponse({ description: 'Dados ou identificador inválidos.' })
@UseGuards(AdminSessionGuard)
@Controller('tables')
export class TablesController {
  constructor(
    private readonly tablesService: TablesService,
    private readonly diningSessions: DiningSessionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista as mesas do restaurante da sessão' })
  @ApiOkResponse({ type: [TableResponseDto] })
  list(@CurrentAdmin() principal: AdminPrincipal) {
    return this.tablesService.list(principal);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma mesa e o código público do QR' })
  @ApiBody({ type: CreateTableDto })
  @ApiCreatedResponse({ type: TableResponseDto })
  @ApiForbiddenResponse({
    description: 'Apenas OWNER e ADMIN podem criar mesas.',
  })
  @ApiConflictResponse({ description: 'Já existe uma mesa com esse nome.' })
  create(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() dto: CreateTableDto,
  ) {
    return this.tablesService.create(principal, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma mesa do restaurante da sessão' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TableResponseDto })
  @ApiNotFoundResponse({ description: 'Mesa não encontrada.' })
  get(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tablesService.get(principal, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomeia ou ativa/desativa uma mesa' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ type: TableResponseDto })
  @ApiForbiddenResponse({
    description: 'Apenas OWNER e ADMIN podem alterar mesas.',
  })
  @ApiNotFoundResponse({ description: 'Mesa não encontrada.' })
  @ApiConflictResponse({ description: 'Já existe uma mesa com esse nome.' })
  update(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.update(principal, id, dto);
  }

  @Post(':id/session')
  @ApiOperation({ summary: 'Abre um atendimento para a mesa' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiCreatedResponse({ type: DiningSessionResponseDto })
  @ApiOkResponse({
    type: DiningSessionResponseDto,
    description: 'Retorna o atendimento já aberto em uma repetição.',
  })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem abrir.' })
  @ApiNotFoundResponse({ description: 'Mesa não encontrada.' })
  @ApiConflictResponse({ description: 'A mesa está inativa.' })
  async openSession(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.diningSessions.open(principal, id);
    if (!result.created) response.status(HttpStatus.OK);
    return result.session;
  }

  @Get(':id/session')
  @ApiOperation({ summary: 'Consulta o atendimento aberto e sua conta' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DiningSessionEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Mesa não encontrada.' })
  getSession(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.diningSessions.getCurrent(principal, id);
  }
}

@ApiTags('dining sessions')
@ApiBearerAuth('admin-session')
@ApiUnauthorizedResponse({
  description: 'Sessão administrativa ausente ou inválida.',
})
@ApiBadRequestResponse({ description: 'Identificador inválido.' })
@UseGuards(AdminSessionGuard)
@Controller('sessions')
export class DiningSessionsController {
  constructor(private readonly diningSessions: DiningSessionsService) {}

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra o atendimento após finalizar os pedidos' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: DiningSessionResponseDto })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem encerrar.' })
  @ApiNotFoundResponse({ description: 'Atendimento não encontrado.' })
  @ApiConflictResponse({
    description: 'Finalize ou cancele os pedidos antes de encerrar.',
  })
  close(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.diningSessions.close(principal, id);
  }
}
