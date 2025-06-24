import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from './storage.service';
import {
  UploadFileDto,
  UploadMultipleFilesDto,
  FileResponseDto,
  FileListResponseDto,
  GetSignedUrlDto,
  SignedUrlResponseDto,
  ImageTransformDto,
  ImageUrlResponseDto,
  StorageStatsDto,
} from './dto';
import { StorageListOptions } from './interfaces';

@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({ status: 201, type: FileResponseDto })
  async uploadFile(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|webp|svg|pdf|txt|csv|json|docx|xlsx|pptx)$/,
          }),
        ],
      })
    )
    file: Express.Multer.File,
    @Body() dto: UploadFileDto
  ): Promise<FileResponseDto> {
    const uploadedFile = await this.storageService.uploadFile(
      user.id,
      dto.filename || file.originalname,
      file.buffer,
      file.mimetype,
      {
        folder: dto.folder,
        public: dto.public,
        metadata: dto.metadata,
      }
    );

    return this.mapToFileResponse(uploadedFile);
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiBody({ type: UploadMultipleFilesDto })
  @ApiResponse({ status: 201, type: [FileResponseDto] })
  async uploadMultipleFiles(
    @CurrentUser() user: any,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB per file
        ],
      })
    )
    files: Express.Multer.File[],
    @Body() dto: UploadMultipleFilesDto
  ): Promise<FileResponseDto[]> {
    const uploadPromises = files.map(file =>
      this.storageService.uploadFile(user.id, file.originalname, file.buffer, file.mimetype, {
        folder: dto.folder,
        public: dto.public,
      })
    );

    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles.map(file => this.mapToFileResponse(file));
  }

  @Get()
  @ApiOperation({ summary: 'List user files' })
  @ApiResponse({ status: 200, type: FileListResponseDto })
  async listFiles(
    @CurrentUser() user: any,
    @Query('prefix') prefix?: string,
    @Query('limit') limit?: number,
    @Query('continuationToken') continuationToken?: string
  ): Promise<FileListResponseDto> {
    const options: StorageListOptions = {
      prefix,
      maxKeys: limit,
      continuationToken,
    };

    const result = await this.storageService.listFiles(user.id, options);

    return {
      files: result.files.map(file => this.mapToFileResponse(file)),
      folders: result.folders,
      continuationToken: result.continuationToken,
      isTruncated: result.isTruncated,
      totalCount: result.files.length,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({ status: 200, type: StorageStatsDto })
  async getStorageStats(@CurrentUser() user: any): Promise<StorageStatsDto> {
    const stats = await this.storageService.getUserStorageStats(user.id);
    const limit = 10 * 1024 * 1024 * 1024; // 10GB default limit

    return {
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      totalSizeFormatted: this.formatBytes(stats.totalSize),
      storageLimit: limit,
      storageLimitFormatted: this.formatBytes(limit),
      usagePercentage: (stats.totalSize / limit) * 100,
      byType: Object.entries(stats.byType).reduce(
        (acc, [type, data]) => {
          acc[type] = {
            ...data,
            percentage: (data.size / stats.totalSize) * 100,
          };
          return acc;
        },
        {} as Record<string, any>
      ),
      lastUpdated: new Date(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details' })
  @ApiResponse({ status: 200, type: FileResponseDto })
  async getFile(@CurrentUser() user: any, @Param('id') fileId: string): Promise<FileResponseDto> {
    const file = await this.storageService.getFile(fileId, user.id);

    if (!file) {
      throw new BadRequestException('File not found');
    }

    return this.mapToFileResponse(file);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get signed URL for private file' })
  @ApiResponse({ status: 200, type: SignedUrlResponseDto })
  async getSignedUrl(
    @CurrentUser() user: any,
    @Param('id') fileId: string,
    @Query() query: GetSignedUrlDto
  ): Promise<SignedUrlResponseDto> {
    const url = await this.storageService.getSignedUrl(fileId, user.id, {
      expiresIn: query.expiresIn,
      responseContentType: query.responseContentType,
      responseContentDisposition: query.responseContentDisposition,
    });

    return {
      url,
      expiresAt: new Date(Date.now() + (query.expiresIn || 3600) * 1000),
    };
  }

  @Get(':id/image-url')
  @ApiOperation({ summary: 'Get image URL with transformations' })
  @ApiResponse({ status: 200, type: ImageUrlResponseDto })
  async getImageUrl(
    @CurrentUser() user: any,
    @Param('id') fileId: string,
    @Query() query: ImageTransformDto
  ): Promise<ImageUrlResponseDto> {
    // Verify user owns the file
    await this.storageService.getFile(fileId, user.id);

    const url = await this.storageService.getImageUrl(fileId, {
      width: query.width,
      height: query.height,
      quality: query.quality,
      format: query.format as any,
      fit: query.fit as any,
      blur: query.blur,
      sharpen: query.sharpen,
      grayscale: query.grayscale,
      rotate: query.rotate,
    });

    return {
      url,
      cdnUrl: url,
      transformations: query,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 204 })
  async deleteFile(@CurrentUser() user: any, @Param('id') fileId: string): Promise<void> {
    await this.storageService.deleteFile(fileId, user.id);
  }

  private mapToFileResponse(file: any): FileResponseDto {
    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      cdnUrl: file.cdnUrl,
      bucket: file.bucket,
      key: file.key,
      metadata: file.metadata,
      uploadedAt: file.uploadedAt,
      lastModified: file.lastModified,
      variants: file.variants,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
