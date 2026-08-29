import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/spotify/auth";
import { setOAuthTransitCookies } from "@/lib/session";

export async function GET() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  await setOAuthTransitCookies({ verifier, state });

  const authorizeUrl = buildAuthorizeUrl({ codeChallenge: challenge, state });
  return NextResponse.redirect(authorizeUrl);
}
