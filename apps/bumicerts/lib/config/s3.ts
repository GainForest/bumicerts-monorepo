import { S3Client } from "@aws-sdk/client-s3";
import { serverEnv as env } from "@/lib/env/server";

// Initialize S3 client with credentials from environment
export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Export bucket name for convenience
export const S3_BUCKET = env.AWS_S3_BUCKET;
