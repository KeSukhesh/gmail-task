import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

function createS3Client() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS environment variables");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

const s3 = createS3Client();


export async function uploadToS3(key: string, content: string): Promise<string> {
  const bucketName = process.env.AWS_BUCKET_NAME!;
  const region = process.env.AWS_REGION!;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: "text/html",
  });

  try {
    await s3.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error("Failed to upload to S3");
  }
}

export async function fetchS3Html(key: string): Promise<string> {
  const bucketName = process.env.AWS_BUCKET_NAME!;
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });

  const response = await s3.send(command);
  const stream = response.Body as NodeJS.ReadableStream;

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
}