// functions/api/_lib/auth.ts
//
// Verifies a Firebase Authentication ID token without the Firebase Admin SDK
// (not Workers-compatible). Validates the RS256 signature against Google's
// published JWKS, plus issuer/audience, using `jose`.

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Env } from './types';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// createRemoteJWKSet caches keys per isolate and re-fetches on a verification
// miss (e.g. key rotation), so this is safe at module scope.
const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export class AuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403 = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Verifies the Firebase ID token from the Authorization header and returns the uid. */
export async function verifyFirebaseToken(request: Request, env: Env): Promise<string> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw new AuthError('Missing Authorization header');
  if (!env.VITE_FIREBASE_PROJECT_ID) throw new AuthError('Auth not configured', 403);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${env.VITE_FIREBASE_PROJECT_ID}`,
      audience: env.VITE_FIREBASE_PROJECT_ID,
    });

    if (typeof payload.sub !== 'string' || !payload.sub) throw new AuthError('Token missing subject');
    return payload.sub;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('Invalid or expired token');
  }
}