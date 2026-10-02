import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import type { RequestWithUser } from '../utils/types/request-with-user.type';
import { RoleEnum } from '../roles/roles.enum';

@Injectable()
export class CompanyMembershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser<JwtPayloadType | undefined>>();

    if (String(request.user?.role?.id) === String(RoleEnum.admin)) {
      return true;
    }

    return !!request.user?.companyId;
  }
}
