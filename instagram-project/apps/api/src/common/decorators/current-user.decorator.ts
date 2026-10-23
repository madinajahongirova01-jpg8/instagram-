import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) {
    throw new UnauthorizedException();
  }
  return request.user;
});
