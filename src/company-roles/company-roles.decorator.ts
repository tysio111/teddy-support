import { SetMetadata } from '@nestjs/common';

export const CompanyRoles = (...roles: string[]) =>
  SetMetadata('companyRoles', roles);
