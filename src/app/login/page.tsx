import { LoginButton } from "@/components/LoginButton";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Something didn't match up during login — mind trying again?",
  token_exchange_failed: "Spotify didn't want to hand over a token. Try again in a moment.",
  access_denied: "Login was cancelled — no data was read.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
      <h1 className="font-display text-4xl text-teal">What we&apos;ll read</h1>
      <ul className="max-w-md text-left text-foreground-muted space-y-3 list-disc list-inside">
        <li>
          <span className="text-foreground">Your top artists &amp; tracks</span> — used
          as starting points to search outward from.
        </li>
        <li>
          <span className="text-foreground">Your saved library</span> — used only to
          filter out music you already have, never shown or stored elsewhere.
        </li>
      </ul>
      <p className="max-w-md text-sm text-foreground-muted">
        We never request write access to your account — no playlists get changed,
        nothing gets followed or saved on your behalf. Tokens live only in an
        encrypted cookie in your browser; there&apos;s no database on our end.
      </p>
      {error && (
        <p className="text-danger max-w-md" role="alert">
          {ERROR_MESSAGES[error] ?? "Something went wrong — please try again."}
        </p>
      )}
      <LoginButton />
    </main>
  );
}
