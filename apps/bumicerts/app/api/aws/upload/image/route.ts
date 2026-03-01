import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";

import { s3Client, S3_BUCKET } from "@/lib/config/s3";
import { getAppSession } from "gainforest-sdk/oauth";

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Max file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type UploadResponse = {
  url: string;
};

type ErrorResponse = {
  error: string;
  details?: string;
};

/**
 * POST /api/upload/cover-image
 * Upload a cover image to AWS S3
 *
 * Request: multipart/form-data with "file" field
 * Response: { url: string } or { error: string }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse | ErrorResponse>> {
  const session = await getAppSession();
  if (!session.isLoggedIn || !session.did) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        {
          error: "No file provided. Please include a file in the 'file' field.",
        },
        { status: 400 }
      );
    }

    // Validate file is not empty
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Validate MIME type
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          details: `Allowed types: ${ALLOWED_MIME_TYPES.join(
            ", "
          )}. Received: ${file.type}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          details: `Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB. Received: ${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB`,
        },
        { status: 400 }
      );
    }

    // Generate unique key
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueId = crypto.randomUUID();
    const key = `cover-images/${uniqueId}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // Optional: Set cache control for better performance
      CacheControl: "public, max-age=31536000, immutable",
    });

    await s3Client.send(command);

    // Construct public URL
    const region = process.env.AWS_REGION || "us-east-1";
    const url = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
