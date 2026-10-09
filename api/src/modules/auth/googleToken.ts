import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
};

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleProfile | null> {
  const audience = [
    process.env.GOOGLE_CLIENT_ID_ANDROID?.trim(),
    process.env.GOOGLE_CLIENT_ID_WEB?.trim(),
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim(),
  ].filter(Boolean) as string[];

  if (audience.length === 0) {
    console.warn('[findr-auth] No GOOGLE_CLIENT_ID_* configured');
    return null;
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
    };
  } catch {
    return null;
  }
}
