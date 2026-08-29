import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify/auth";
import { consumeOAuthTransitCookies, setSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const error = searchParams.get("error");

  const { verifier, state } = await consumeOAuthTransitCookies();

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !returnedState || !verifier || !state || returnedState !== state) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    await setSessionCookie(tokens);
  } catch {
    return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
  }

  return NextResponse.redirect(new URL("/questionnaire", request.url));
}
