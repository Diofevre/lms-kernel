import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { getS3Client, getDefaultBucket } from "./client.js";

export interface UploadOptions {
  body: Buffer | Uint8Array | ReadableStream;
  key: string;
  contentType: string;
  bucket?: string;
  metadata?: Record<string, string>;
}

export async function uploadToS3(options: UploadOptions): Promise<{ key: string; bucket: string }> {
  const bucket = options.bucket ?? getDefaultBucket();
  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
    Metadata: options.metadata,
  }));
  return { key: options.key, bucket };
}

/** Build a unique S3 key: prefix/uuid/sanitized-filename */
export function buildS3Key(prefix: string, originalName: string): string {
  const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return `${prefix}/${randomUUID()}/${sanitized}`;
}
