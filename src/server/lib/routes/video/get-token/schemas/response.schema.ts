import { z } from '@hono/zod-openapi';

export const GetTokenResponseBodySchema = z
  .object({
    roomName: z.string().describe('The name of the room'),
    token: z.string().describe('The token for the participant'),
    url: z.string().describe('The URL of the LiveKit server'),
  })
  .openapi('GetTokenResponseBody');

export type GetTokenResponseBody = z.infer<typeof GetTokenResponseBodySchema>;
