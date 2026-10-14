import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  constructor(private readonly tablesService: TablesService) {}

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
}
