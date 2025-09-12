// s3Upload.js
require("dotenv").config();

const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

async function uploadPdfAndGetUrl(pdfBuffer, opts = {}) {
  const region = opts.region || process.env.AWS_REGION;
  const bucket = opts.bucket || process.env.S3_BUCKET_NAME;
  const expiresIn = opts.expiresIn ?? 900; // 15 min

  if (!region || !bucket) {
    throw new Error("Missing required config: AWS_REGION and S3_BUCKET_NAME must be set.");
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("Missing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in environment.");
  }

  // ✅ Explicit credentials for local runs
  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN, // ok if undefined
    },
  });

 
  const key = `Service-Agreement-${new Date().toISOString().replace(/[:.]/g,"-")}.pdf`;

  const putParams = {
    Bucket: bucket,
    Key: key,
    Body: pdfBuffer,
    ContentType: "application/pdf",
    // Optional: leave encryption off, or use S3-managed (AES256):
    // ServerSideEncryption: "AES256",
  };

  await s3.send(new PutObjectCommand(putParams));

  const presignedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );

  return { bucket, key, region, presignedUrl };
}

module.exports = { uploadPdfAndGetUrl };
