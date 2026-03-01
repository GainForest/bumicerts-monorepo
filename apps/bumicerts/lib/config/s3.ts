import { S3Client } from "@aws-sdk/client-s3";

// Initialize S3 client with credentials from environment
export const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

// Export bucket name for convenience
export const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "";
