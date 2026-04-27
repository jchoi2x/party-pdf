import type { NewDocument } from '../db/schema';
import { initS3Client } from '../utils/s3';

interface UploadUrlItem {
  id: string;
  filename: string;
  url: string;
  bucketPath: string;
  downloadUrl: string;
}

interface UploadUrlDocumentsRepository {
  createMany(rows: NewDocument[]): Promise<unknown>;
}

export interface CreateUploadUrlsInput {
  ownerId: string;
  filenames: string[];
  contentType: string;
}

export interface CreateUploadUrlsResult {
  data: UploadUrlItem[];
}

export async function createUploadUrls(
  repository: UploadUrlDocumentsRepository,
  input: CreateUploadUrlsInput,
): Promise<CreateUploadUrlsResult> {
  const { generateUploadUrl } = initS3Client();

  const data = await Promise.all(
    input.filenames.map((filename) => {
      const prefix = `${input.ownerId}/unassigned`;
      return generateUploadUrl({
        prefix,
        contentType: input.contentType,
        name: filename,
      });
    }),
  );

  const rows: NewDocument[] = data.map((doc) => ({
    id: doc.id,
    ownerId: input.ownerId,
    sessionId: null,
    filename: doc.filename,
    url: doc.url,
    downloadUrl: doc.downloadUrl,
    bucketPath: doc.bucketPath,
    createdAt: Date.now().toString(),
    status: 'pending',
  }));
  await repository.createMany(rows);

  return { data };
}
