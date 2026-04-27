import { z } from '@hono/zod-openapi';

const SessionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
});

const DocumentSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  filename: z.string(),
  url: z.string(),
  downloadUrl: z.string(),
  bucketPath: z.string(),
  createdAt: z.string(),
  status: z.enum(['pending', 'ready']),
});

const ParticipantSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  role: z.enum(['leader', 'member']),
  createdAt: z.string(),
});

const SessionDetailSchema = z.object({
  session: SessionSchema,
  documents: z.array(DocumentSchema),
  participants: z.array(ParticipantSchema),
});

export const SessionsResponseSchema = z.object({
  data: z.array(SessionDetailSchema),
  total: z.number().int(),
  totalPages: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type SessionsResponse = z.infer<typeof SessionsResponseSchema>;
