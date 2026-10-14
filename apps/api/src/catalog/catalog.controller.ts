import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import {
  CatalogCategoryResponseDto,
  CatalogProductQueryDto,
  CatalogProductResponseDto,
  CreateCatalogCategoryDto,
  CreateCatalogProductDto,
  UpdateCatalogCategoryDto,
  UpdateCatalogProductDto,
} from './catalog.dto.js';
import { CatalogService } from './catalog.service.js';

@ApiTags('catalog categories')
@ApiBearerAuth('admin-session')
@ApiUnauthorizedResponse({
  description: 'Sessão administrativa ausente ou inválida.',
})
@ApiBadRequestResponse({ description: 'Dados inválidos.' })
@UseGuards(AdminSessionGuard)
@Controller('catalog/categories')
export class CatalogCategoriesController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as categorias do restaurante da sessão' })
  @ApiOkResponse({ type: [CatalogCategoryResponseDto] })
  list(@CurrentAdmin() principal: AdminPrincipal) {
    return this.catalogService.listCategories(principal);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma categoria no restaurante da sessão' })
  @ApiBody({ type: CreateCatalogCategoryDto })
  @ApiCreatedResponse({ type: CatalogCategoryResponseDto })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem alterar o catálogo.' })
  @ApiConflictResponse({
    description: 'Já existe uma categoria com esse nome.',
  })
  create(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() dto: CreateCatalogCategoryDto,
  ) {
    return this.catalogService.createCategory(principal, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma categoria do restaurante da sessão' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CatalogCategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada.' })
  get(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.getCategory(principal, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma categoria do restaurante da sessão' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateCatalogCategoryDto })
  @ApiOkResponse({ type: CatalogCategoryResponseDto })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem alterar o catálogo.' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada.' })
  @ApiConflictResponse({
    description: 'Já existe uma categoria com esse nome.',
  })
  update(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogCategoryDto,
  ) {
    return this.catalogService.updateCategory(principal, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove uma categoria vazia do restaurante da sessão',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: 'Categoria removida.' })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem alterar o catálogo.' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada.' })
  @ApiConflictResponse({ description: 'A categoria ainda possui produtos.' })
  remove(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.deleteCategory(principal, id);
  }
}

@ApiTags('catalog products')
@ApiBearerAuth('admin-session')
@ApiUnauthorizedResponse({
  description: 'Sessão administrativa ausente ou inválida.',
})
@ApiBadRequestResponse({ description: 'Dados inválidos.' })
@UseGuards(AdminSessionGuard)
@Controller('catalog/products')
export class CatalogProductsController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista produtos ativos ou, para administradores, arquivados',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    format: 'uuid',
  })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOkResponse({ type: [CatalogProductResponseDto] })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem consultar produtos arquivados.' })
  list(
    @CurrentAdmin() principal: AdminPrincipal,
    @Query() query: CatalogProductQueryDto,
  ) {
    return this.catalogService.listProducts(principal, query);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um produto no restaurante da sessão' })
  @ApiBody({ type: CreateCatalogProductDto })
  @ApiCreatedResponse({ type: CatalogProductResponseDto })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem alterar o catálogo.' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada.' })
  create(
    @CurrentAdmin() principal: AdminPrincipal,
    @Body() dto: CreateCatalogProductDto,
  ) {
    return this.catalogService.createProduct(principal, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um produto do restaurante da sessão' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CatalogProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  get(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.getProduct(principal, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza ou restaura um produto do restaurante da sessão',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateCatalogProductDto })
  @ApiOkResponse({ type: CatalogProductResponseDto })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem alterar o catálogo.' })
  @ApiNotFoundResponse({ description: 'Produto ou categoria não encontrada.' })
  update(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogProductDto,
  ) {
    return this.catalogService.updateProduct(principal, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Arquiva um produto sem apagar seus dados' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: 'Produto arquivado.' })
  @ApiForbiddenResponse({ description: 'Apenas OWNER e ADMIN podem alterar o catálogo.' })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  archive(
    @CurrentAdmin() principal: AdminPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.archiveProduct(principal, id);
  }
}
