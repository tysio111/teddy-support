import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import type { RequestWithUser } from '../utils/types/request-with-user.type';
import { RoleEnum } from '../roles/roles.enum';

@Injectable()
export class CompanyRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(
      'companyRoles',
      [context.getClass(), context.getHandler()],
    );
    if (!roles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser<JwtPayloadType | undefined>>();

    if (String(request.user?.role?.id) === String(RoleEnum.admin)) {
      return true;
    }

    if (!request.user?.companyId) {
      return false;
    }

    return roles.map(String).includes(String(request.user.companyRole ?? ''));
  }
}
