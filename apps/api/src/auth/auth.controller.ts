import { createHash } from 'node:crypto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerGetTrackerFunction } from '@nestjs/throttler';
import { AdminSessionGuard } from './admin-session.guard.js';
import { AuthService } from './auth.service.js';
import {
  CreatedSessionDto,
  CreateSessionRequestDto,
  MembershipSelectionRequiredDto,
  SessionMetadataDto,
  TooManyRequestsDto,
} from './auth.dto.js';
import { CurrentAdmin } from './admin-principal.js';
import type { AdminPrincipal } from './admin-principal.js';
import { GatewaySecretGuard } from './gateway-secret.guard.js';

function getTrustedClientKey(request: Record<string, unknown>): string {
  const headers = request.headers as Record<string, unknown> | undefined;
  const sourceKey = headers?.['x-comandinha-client-key'];
  return typeof sourceKey === 'string' && /^[a-f0-9]{64}$/.test(sourceKey)
    ? sourceKey
    : 'missing-source';
}

const getSourceTracker: ThrottlerGetTrackerFunction = (request) => getTrustedClientKey(request);

const getAccountTracker: ThrottlerGetTrackerFunction = (request) => {
  const body = request.body as { email?: unknown } | undefined;
  const accountKey = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  return createHash('sha256')
    .update(`${accountKey}\0${getTrustedClientKey(request)}`, 'utf8')
    .digest('hex');
};

@ApiTags('auth')
@Controller('auth/sessions')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @UseGuards(GatewaySecretGuard, ThrottlerGuard)
  @Throttle({
    account: { limit: 5, ttl: 60_000, getTracker: getAccountTracker },
    source: { limit: 20, ttl: 60_000, getTracker: getSourceTracker },
  })
  @ApiOperation({ summary: 'Cria uma sessão administrativa pelo gateway same-origin' })
  @ApiHeader({ name: 'x-comandinha-gateway-secret', required: true })
  @ApiHeader({
    name: 'x-comandinha-client-key',
    required: false,
    description: 'Hash da origem confiável encaminhado pelo gateway; compõe o limite por conta/origem.',
  })
  @ApiBody({ type: CreateSessionRequestDto })
  @ApiCreatedResponse({ type: CreatedSessionDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas ou gateway não autorizado.' })
  @ApiTooManyRequestsResponse({
    type: TooManyRequestsDto,
    description: 'Limite de tentativas excedido.',
  })
  @ApiConflictResponse({ type: MembershipSelectionRequiredDto })
  create(@Body() credentials: CreateSessionRequestDto) {
    return this.authService.createSession(credentials);
  }

  @Get('current')
  @UseGuards(GatewaySecretGuard, AdminSessionGuard)
  @ApiBearerAuth('admin-session')
  @ApiHeader({ name: 'x-comandinha-gateway-secret', required: true })
  @ApiOperation({ summary: 'Valida a sessão administrativa atual' })
  @ApiOkResponse({ type: SessionMetadataDto })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente, revogada ou expirada.' })
  current(@CurrentAdmin() principal: AdminPrincipal) {
    return this.authService.toSessionMetadata(principal);
  }

  @Delete('current')
  @UseGuards(GatewaySecretGuard, AdminSessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('admin-session')
  @ApiHeader({ name: 'x-comandinha-gateway-secret', required: true })
  @ApiOperation({ summary: 'Revoga a sessão administrativa atual' })
  @ApiNoContentResponse({ description: 'Sessão revogada.' })
  @ApiUnauthorizedResponse({ description: 'Sessão ausente, revogada ou expirada.' })
  async revoke(@CurrentAdmin() principal: AdminPrincipal): Promise<void> {
    await this.authService.revokeSession(principal);
  }
}
