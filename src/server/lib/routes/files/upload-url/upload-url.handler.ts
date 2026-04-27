import type { Context } from 'hono';

import type { NewDocument } from '../../../db/schema';
import { initS3Client } from '../../../utils/s3';

type Ctx = Context<
  { Bindings: Env },
  '/docs/upload-url',
  {
    in: { query: { filenames: string[]; contentType: string } };
    out: { query: { filenames: string[]; contentType: string } };
  }
>;

export const uploadUrlHandler = async (c: Ctx) => {
  const jwtPayload = c.get('jwtPayload');
  const ownerId = jwtPayload.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const filenames = c.req.queries('filenames') ?? [];
  const contentType = c.req.query('contentType') ?? 'application/pdf';
  const packetId = crypto.randomUUID();
  const { generateUploadUrl } = initS3Client();

  const data = await Promise.all(
    filenames.map((filename) => {
      const prefix = `${ownerId}/${packetId}`;
      return generateUploadUrl({
        prefix,
        contentType,
        name: filename,
      });
    }),
  );

  const documentsRepository = c.get('documentsRepository');
  const rows: NewDocument[] = data.map((doc) => ({
    ownerId,
    packetId,
    filename: doc.filename,
    url: doc.url,
    downloadUrl: doc.downloadUrl,
    bucketPath: doc.bucketPath,
    createdAt: Date.now().toString(),
    status: 'pending',
  }));
  await documentsRepository.createMany(rows);

  return c.json({ data, id: packetId }, 200);
};
