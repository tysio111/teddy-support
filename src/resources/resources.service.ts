import { FilesService } from '../files/files.service';
import { FileType } from '../files/domain/file';

import { CompaniesService } from '../companies/companies.service';

import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceRepository } from './infrastructure/persistence/resource.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Resource } from './domain/resource';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly fileService: FilesService,

    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly resourceRepository: ResourceRepository,
  ) {}

  async create(
    currentUser: JwtPayloadType,
    createResourceDto: CreateResourceDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    let file: FileType | null | undefined = undefined;

    if (createResourceDto.file) {
      const fileObject = await this.fileService.findById(
        createResourceDto.file.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'notExists',
          },
        });
      }
      file = fileObject;
    } else if (createResourceDto.file === null) {
      file = null;
    }

    // The company is always the caller's own — a client-supplied `company`
    // field, if any, is ignored.
    if (!currentUser.companyId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }

    const companyObject = await this.companyService.findById(
      currentUser.companyId,
      currentUser,
    );
    if (!companyObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }
    const company = companyObject;

    return this.resourceRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      vectorRef: createResourceDto.vectorRef,

      status: createResourceDto.status,

      sourceUrl: createResourceDto.sourceUrl,

      file,

      type: createResourceDto.type,

      title: createResourceDto.title,

      company,
    });
  }

  findAllWithPagination({
    paginationOptions,
    currentUser,
  }: {
    paginationOptions: IPaginationOptions;
    currentUser: JwtPayloadType;
  }) {
    return this.resourceRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      companyId: isPlatformAdmin(currentUser)
        ? undefined
        : (currentUser.companyId ?? undefined),
    });
  }

  async findById(id: Resource['id'], currentUser: JwtPayloadType) {
    const resource = await this.resourceRepository.findById(id);

    if (
      resource &&
      !isPlatformAdmin(currentUser) &&
      String(resource.company?.id) !== String(currentUser.companyId)
    ) {
      throw new NotFoundException();
    }

    return resource;
  }

  findByIds(ids: Resource['id'][]) {
    return this.resourceRepository.findByIds(ids);
  }

  async update(
    id: Resource['id'],
    currentUser: JwtPayloadType,
    updateResourceDto: UpdateResourceDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    await this.findById(id, currentUser); // throws NotFoundException if foreign

    let file: FileType | null | undefined = undefined;

    if (updateResourceDto.file) {
      const fileObject = await this.fileService.findById(
        updateResourceDto.file.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'notExists',
          },
        });
      }
      file = fileObject;
    } else if (updateResourceDto.file === null) {
      file = null;
    }

    // A resource can never be reassigned to a different company via update.
    return this.resourceRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      vectorRef: updateResourceDto.vectorRef,

      status: updateResourceDto.status,

      sourceUrl: updateResourceDto.sourceUrl,

      file,

      type: updateResourceDto.type,

      title: updateResourceDto.title,
    });
  }

  async remove(id: Resource['id'], currentUser: JwtPayloadType) {
    await this.findById(id, currentUser); // throws NotFoundException if foreign

    return this.resourceRepository.remove(id);
  }
}
