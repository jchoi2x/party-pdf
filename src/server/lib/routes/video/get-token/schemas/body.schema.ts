import { z } from '@hono/zod-openapi';

export const GetTokenRequestBodySchema = z
  .object({
    roomName: z.string().describe('The name of the room'),
    participantName: z.string().describe('Name of the participant'),
  })
  .openapi('GetTokenRequestBody');

export type GetTokenRequestBody = z.infer<typeof GetTokenRequestBodySchema>;
