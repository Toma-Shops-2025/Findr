import { SignJWT, jwtVerify } from 'jose';

const DEFAULT_SECRET = 'dev-only-change-me-findr-jwt-secret';

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export async function signAccessToken(
  payload: AuthTokenPayload,
  expiresIn = process.env.JWT_EXPIRES_IN ?? '7d',
): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifyAccessToken(
  token: string,
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!sub || !email) return null;
    return { sub, email };
  } catch {
    return null;
  }
}

export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export async function signAdminToken(email: string): Promise<string> {
  return new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secretKey());
}

export async function verifyAdminToken(
  token: string,
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== 'admin') return null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!email) return null;
    return { email };
  } catch {
    return null;
  }
}
