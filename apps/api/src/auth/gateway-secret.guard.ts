import { createHash, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const gatewaySecretHeader = 'x-comandinha-gateway-secret';
const minimumSecretLength = 32;

@Injectable()
export class GatewaySecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = process.env.AUTH_GATEWAY_SECRET;
    if (!expectedSecret || expectedSecret.length < minimumSecretLength) {
      throw new ServiceUnavailableException('Session gateway is not configured.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const suppliedSecret = request.headers[gatewaySecretHeader];
    if (typeof suppliedSecret !== 'string' || suppliedSecret.length < minimumSecretLength) {
      throw new UnauthorizedException();
    }

    const expectedHash = createHash('sha256').update(expectedSecret, 'utf8').digest();
    const suppliedHash = createHash('sha256').update(suppliedSecret, 'utf8').digest();

    if (!timingSafeEqual(expectedHash, suppliedHash)) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
