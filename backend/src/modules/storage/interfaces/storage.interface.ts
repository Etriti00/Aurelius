export interface FileMetadata {
  tags?: string[];
  description?: string;
  version?: string;
  checksum?: string;
  encoding?: string;
  variants?: Record<string, string>;
  customProperties?: Record<string, string | number | boolean>;
}

export interface StorageFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cdnUrl?: string;
  bucket: string;
  key: string;
  metadata?: FileMetadata;
  uploadedAt: Date;
  lastModified?: Date;
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  filename?: string;
  public?: boolean;
  metadata?: Record<string, any>;
  contentType?: string;
  cacheControl?: string;
  expires?: Date;
  tags?: Record<string, string>;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface StorageListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
  delimiter?: string;
}

export interface StorageListResult {
  files: StorageFile[];
  folders: string[];
  continuationToken?: string;
  isTruncated: boolean;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  rotate?: number;
}

export interface StorageProvider {
  upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<StorageFile>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  list(options?: StorageListOptions): Promise<StorageListResult>;
  copy(sourceKey: string, destinationKey: string): Promise<void>;
  move(sourceKey: string, destinationKey: string): Promise<void>;
}
