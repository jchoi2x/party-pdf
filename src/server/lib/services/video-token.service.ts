import { AccessToken } from 'livekit-server-sdk';

export interface CreateVideoTokenInput {
  roomName: string;
  participantName: string;
}

export interface CreateVideoTokenResult {
  roomName: string;
  token: string;
  url: string;
}

export async function createVideoToken(
  env: Pick<Env, 'LIVEKIT_API_KEY' | 'LIVEKIT_API_SECRET' | 'LIVEKIT_URL'>,
  input: CreateVideoTokenInput,
): Promise<CreateVideoTokenResult> {
  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: input.participantName,
  });

  at.addGrant({ roomJoin: true, room: input.roomName });
  const token = await at.toJwt();

  return {
    token,
    roomName: input.roomName,
    url: env.LIVEKIT_URL,
  };
}
