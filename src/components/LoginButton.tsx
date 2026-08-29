export function LoginButton({ label = "Connect Spotify" }: { label?: string }) {
  return (
    <a
      href="/api/auth/login"
      className="inline-block rounded-full px-8 py-3 font-display text-2xl text-background
                 bg-gradient-to-r from-pink-strong to-purple-strong
                 shadow-[0_0_24px_rgba(255,46,154,0.35)]
                 transition-transform hover:scale-[1.03] active:scale-[0.98]"
    >
      {label}
    </a>
  );
}
