import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { basename, join } from 'path';

import { FileRepository } from './infrastructure/persistence/file.repository';
import { FileType } from './domain/file';
import { NullableType } from '../utils/types/nullable.type';
import { AllConfigType } from '../config/config.type';
import { s3Credentials } from './config/s3-credentials';
import { FileDriver } from './config/file-config.type';

@Injectable()
export class FilesService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  findById(id: FileType['id']): Promise<NullableType<FileType>> {
    return this.fileRepository.findById(id);
  }

  findByIds(ids: FileType['id'][]): Promise<FileType[]> {
    return this.fileRepository.findByIds(ids);
  }

  // Reads the stored bytes of an uploaded file.
  async getContent(file: FileType): Promise<Buffer> {
    const driver = this.configService.getOrThrow('file.driver', {
      infer: true,
    });

    if (driver === FileDriver.LOCAL) {
      // Stored as `/<apiPrefix>/v1/files/<name>`, saved on disk in ./files.
      return readFile(join('./files', basename(file.path)));
    }

    const s3 = new S3Client({
      region: this.configService.get('file.awsS3Region', { infer: true }),
      credentials: s3Credentials(
        this.configService.get('file.accessKeyId', { infer: true }),
        this.configService.get('file.secretAccessKey', { infer: true }),
      ),
    });
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: this.configService.getOrThrow('file.awsDefaultS3Bucket', {
          infer: true,
        }),
        Key: file.path,
      }),
    );
    if (!response.Body) {
      throw new Error(`File ${file.id} has no content`);
    }

    return Buffer.from(await response.Body.transformToByteArray());
  }
}
