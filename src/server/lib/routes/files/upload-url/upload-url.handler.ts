import type { Context } from 'hono';

import { createUploadUrls } from '../../../services/upload-url.service';

type Ctx = Context<
  { Bindings: Env },
  '/docs/upload-url',
  {
    in: { query: { filenames: string[]; contentType: string } };
    out: { query: { filenames: string[]; contentType: string } };
  }
>;

export const uploadUrlHandler = async (c: Ctx) => {
  const jwtPayload = c.get('jwtPayload') as { sub?: string } | undefined;
  const ownerId = jwtPayload?.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const filenames = c.req.queries('filenames') ?? [];
  const contentType = c.req.query('contentType') ?? 'application/pdf';
  const documentsRepository = c.get('documentsRepository');
  const result = await createUploadUrls(documentsRepository, { ownerId, filenames, contentType });
  return c.json(result, 200);
};
