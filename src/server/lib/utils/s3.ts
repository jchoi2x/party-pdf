import { env } from 'cloudflare:workers';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const initS3Client = () => {
  const s3 = new S3Client({
    region: 'auto', // Required by AWS SDK, not used by R2
    // Provide your R2 endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
    endpoint: env.S3_URL,
    credentials: {
      // Provide your R2 Access Key ID and Secret Access Key
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  async function uploadPdfToS3({
    bucket = env.S3_BUCKET,
    prefix = 'rendercv',
    name,
    contentType = 'application/pdf',
    buffer,
  }: {
    bucket?: string;
    name?: string;
    contentType?: string;
    prefix?: string;
    expiresIn?: number;
    buffer: ArrayBuffer;
  }) {
    const uuid = name ?? crypto.randomUUID();
    const fPath = `${prefix}/${uuid}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: fPath,
      ContentType: contentType,
      Body: new Uint8Array(buffer),
    });

    await s3.send(cmd);

    return `${env.S3_PUBLIC_URL}/${fPath}`;
  }

  /**
   * Generate a presigned upload url for a given key
   *
   * @export
   * @param {S3Client} s3
   * @param {string} bucket
   * @param {string} key
   */
  async function generateUploadUrl({
    bucket = env.S3_BUCKET,
    prefix = 'rendercv',
    name,
    contentType = 'application/pdf',
    expiresIn = 3600,
  }: {
    bucket?: string;
    name?: string;
    contentType?: string;
    prefix?: string;
    expiresIn?: number;
  }) {
    const uuid = crypto.randomUUID();
    const fPath = `${prefix}/${uuid}.pdf`;

    // create a presigned upload url for the given key
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: fPath,
      Metadata: {
        name: name ?? `file.pdf`,
      },
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, cmd, {
      expiresIn,
    });

    return { url, id: uuid };
  }

  function getDownloadUrl({ id, prefix = 'rendercv' }: { id: string; prefix?: string }) {
    const fPath = `${prefix}/${id}.pdf`;
    return `${env.S3_PUBLIC_URL}/${fPath}`;
  }

  return {
    uploadPdfToS3,
    generateUploadUrl,
    getDownloadUrl,
  };
};
