import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getS3Client, getDefaultBucket } from "./client.js";

export async function deleteFromS3(key: string, bucket?: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({
    Bucket: bucket ?? getDefaultBucket(),
    Key: key,
  }));
}

export async function deleteMultipleFromS3(keys: string[], bucket?: string): Promise<void> {
  if (keys.length === 0) return;
  const b = bucket ?? getDefaultBucket();
  // S3 DeleteObjects supports max 1000 keys per request
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await getS3Client().send(new DeleteObjectsCommand({
      Bucket: b,
      Delete: { Objects: batch.map((k) => ({ Key: k })) },
    }));
  }
}
