import { S3Client } from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: process.env["S3_REGION"] ?? process.env["AWS_REGION"] ?? "ca-central-1",
      ...(process.env["S3_ENDPOINT"] ? { endpoint: process.env["S3_ENDPOINT"], forcePathStyle: true } : {}),
    });
  }
  return _client;
}

export function getDefaultBucket(): string {
  const bucket = process.env["S3_BUCKET"];
  if (!bucket) throw new Error("S3_BUCKET environment variable is required");
  return bucket;
}
