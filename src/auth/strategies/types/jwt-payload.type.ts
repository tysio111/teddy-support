import { Session } from '../../../session/domain/session';
import { User } from '../../../users/domain/user';
import { Company } from '../../../companies/domain/company';
import { CompanyMember } from '../../../company-members/domain/company-member';

export type JwtPayloadType = Pick<User, 'id' | 'role'> & {
  sessionId: Session['id'];
  companyId: Company['id'] | null;
  companyRole: CompanyMember['role'] | null;
  iat: number;
  exp: number;
};
