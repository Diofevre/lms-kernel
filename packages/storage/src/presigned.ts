import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, getDefaultBucket } from "./client.js";

export interface PresignedUploadOptions {
  key: string;
  contentType: string;
  bucket?: string;
  expiresIn?: number; // seconds, default 3600
  maxSize?: number; // bytes
}

export interface PresignedDownloadOptions {
  key: string;
  bucket?: string;
  expiresIn?: number; // seconds, default 3600
  filename?: string; // Content-Disposition filename
}

export async function getPresignedUploadUrl(options: PresignedUploadOptions): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: options.bucket ?? getDefaultBucket(),
    Key: options.key,
    ContentType: options.contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: options.expiresIn ?? 3600 });
}

export async function getPresignedDownloadUrl(options: PresignedDownloadOptions): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: options.bucket ?? getDefaultBucket(),
    Key: options.key,
    ...(options.filename ? { ResponseContentDisposition: `attachment; filename="${options.filename}"` } : {}),
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: options.expiresIn ?? 3600 });
}
