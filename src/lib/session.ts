import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { getEnv } from "@/lib/env";
import type { SpotifyTokens } from "@/lib/spotify/types";

const SESSION_COOKIE = "sp_session";
const PKCE_VERIFIER_COOKIE = "sp_pkce_verifier";
const STATE_COOKIE = "sp_oauth_state";

/** Refresh tokens are long-lived credentials — encrypt the cookie, don't just sign it. */
async function getEncryptionKey(): Promise<Uint8Array> {
  const env = getEnv();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(env.SESSION_SECRET)
  );
  return new Uint8Array(digest);
}

export async function setSessionCookie(tokens: SpotifyTokens): Promise<void> {
  const key = await getEncryptionKey();
  const jwe = await new EncryptJWT({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("30d") // outer envelope expiry; refresh token itself governs real lifetime
    .encrypt(key);

  const store = await cookies();
  store.set(SESSION_COOKIE, jwe, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSessionTokens(): Promise<SpotifyTokens | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const key = await getEncryptionKey();
    const { payload } = await jwtDecrypt(raw, key);
    return {
      accessToken: payload.accessToken as string,
      refreshToken: payload.refreshToken as string,
      expiresAt: payload.expiresAt as number,
    };
  } catch {
    return null; // tampered, expired envelope, or key rotation — treat as logged out
  }
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Short-lived cookies used only during the OAuth redirect round-trip. */
export async function setOAuthTransitCookies(params: {
  verifier: string;
  state: string;
}): Promise<void> {
  const store = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10, // 10 minutes — plenty for a login redirect round trip
  };
  store.set(PKCE_VERIFIER_COOKIE, params.verifier, opts);
  store.set(STATE_COOKIE, params.state, opts);
}

export async function consumeOAuthTransitCookies(): Promise<{
  verifier: string | null;
  state: string | null;
}> {
  const store = await cookies();
  const verifier = store.get(PKCE_VERIFIER_COOKIE)?.value ?? null;
  const state = store.get(STATE_COOKIE)?.value ?? null;
  store.delete(PKCE_VERIFIER_COOKIE);
  store.delete(STATE_COOKIE);
  return { verifier, state };
}
