import { FilesService } from '../files/files.service';
import { ResourceStatusEnum } from './resource-status.enum';
import { FileType } from '../files/domain/file';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceRepository } from './infrastructure/persistence/resource.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Resource } from './domain/resource';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly fileService: FilesService,

    // Dependencies here
    private readonly resourceRepository: ResourceRepository,
  ) {}

  async create(createResourceDto: CreateResourceDto) {
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

    return this.resourceRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      extractionError: createResourceDto.extractionError,

      vectorRef: createResourceDto.vectorRef,

      status: createResourceDto.status ?? ResourceStatusEnum.uploaded,

      sourceUrl: createResourceDto.sourceUrl,

      file,

      type: createResourceDto.type,

      title: createResourceDto.title,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.resourceRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Resource['id']) {
    return this.resourceRepository.findById(id);
  }

  findByIds(ids: Resource['id'][]) {
    return this.resourceRepository.findByIds(ids);
  }

  async update(
    id: Resource['id'],

    updateResourceDto: UpdateResourceDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

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

    return this.resourceRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      extractionError: updateResourceDto.extractionError,

      vectorRef: updateResourceDto.vectorRef,

      status: updateResourceDto.status,

      sourceUrl: updateResourceDto.sourceUrl,

      file,

      type: updateResourceDto.type,

      title: updateResourceDto.title,
    });
  }

  remove(id: Resource['id']) {
    return this.resourceRepository.remove(id);
  }
}
