import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayloadType } from '../../auth/strategies/types/jwt-payload.type';
import type { RequestWithUser } from '../types/request-with-user.type';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayloadType => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithUser<JwtPayloadType>>();

    return request.user;
  },
);
