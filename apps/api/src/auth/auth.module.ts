import { Module } from '@nestjs/common';
import { createRequire } from 'node:module';
import type { Reflector as NestReflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '../database/database.module.js';
import { AdminSessionGuard } from './admin-session.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GatewaySecretGuard } from './gateway-secret.guard.js';

// The throttler package is CommonJS, so it needs the CommonJS Reflector token
// when the API runs as ESM. Otherwise Nest loads two distinct class tokens.
const CommonJsReflector = createRequire(import.meta.url)('@nestjs/core').Reflector as
  typeof NestReflector;

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: 'account', ttl: 60_000, limit: 5 },
      { name: 'source', ttl: 60_000, limit: 20 },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminSessionGuard, GatewaySecretGuard, ThrottlerGuard, CommonJsReflector],
  exports: [AuthService, AdminSessionGuard, GatewaySecretGuard],
})
export class AuthModule {}
