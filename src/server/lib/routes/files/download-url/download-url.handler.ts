import type { Context } from "hono";

type Ctx = Context<{ Bindings: Env }, '/download-url/:uuid', { in: { param: { uuid: string; }; }; out: { param: { uuid: string; }; }; }>;

export const downloadUrlHandler = async (c: Ctx) => {
  const jwtPayload = c.get('jwtPayload');

  const id = c.env.DOC.idFromName(jwtPayload.sub as string);
  const stub = c.env.DOC.get(id);
  return stub.fetch(c.req.raw);
};
