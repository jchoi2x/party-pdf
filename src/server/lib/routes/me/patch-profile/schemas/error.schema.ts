import { z } from '@hono/zod-openapi';

export const PatchProfileErrorSchema = z.object({ error: z.string() });

export type PatchProfileError = z.infer<typeof PatchProfileErrorSchema>;
