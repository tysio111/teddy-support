import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { RoleEnum } from './roles.enum';

export function isPlatformAdmin(currentUser: JwtPayloadType): boolean {
  return String(currentUser.role?.id) === String(RoleEnum.admin);
}
