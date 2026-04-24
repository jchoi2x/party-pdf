import type { HttpClient } from '@/services/http.client';

export type JwtClaimsPayload = Record<string, unknown>;

export type UpdateProfileBody = {
  givenName: string;
  familyName: string;
};

export type UpdateProfileResponse = {
  ok: true;
  givenName: string;
  familyName: string;
};

export class UserService {
  constructor(private readonly http: HttpClient) {}

  async getMe() {
    return this.http.get<JwtClaimsPayload>('/api/me');
  }

  async updateProfile(body: UpdateProfileBody) {
    return this.http.patch<UpdateProfileResponse, { error: string }>('/api/me/profile', {
      body: JSON.stringify({
        givenName: body.givenName,
        familyName: body.familyName,
      }),
    });
  }
}
