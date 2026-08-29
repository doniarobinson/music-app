import { getEnv } from "@/lib/env";
import type { SpotifyTokens } from "./types";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

/**
 * Minimum scopes required for the "consensual, minimal-scope" flow:
 * top artists/tracks to derive seeds, saved-library to dedupe against.
 * No write scopes for v1.
 */
export const SPOTIFY_SCOPES = ["user-top-read", "user-library-read"];

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Generates a PKCE code_verifier (43-128 chars, unreserved characters only). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** Derives the PKCE code_challenge (S256) from a code_verifier. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}

export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function buildAuthorizeUrl(params: {
  codeChallenge: string;
  state: string;
}): string {
  const env = getEnv();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", env.SPOTIFY_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", env.SPOTIFY_REDIRECT_URI);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/** Exchanges an authorization code (+ PKCE verifier) for tokens. */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<SpotifyTokens> {
  const env = getEnv();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
          "base64"
        ),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/** Exchanges a refresh token for a fresh access token. */
export async function refreshAccessToken(
  refreshToken: string
): Promise<SpotifyTokens> {
  const env = getEnv();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
          "base64"
        ),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    // Spotify doesn't always rotate the refresh token — keep the old one if absent.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}
