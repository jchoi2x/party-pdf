import type { Context } from 'hono';

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

  const id = c.env.DOC.idFromName(jwtPayload.sub as string);
  const stub = c.env.DOC.get(id);
  return stub.fetch(c.req.raw.clone());
};
