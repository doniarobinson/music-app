import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
      <h1 className="font-display text-5xl sm:text-6xl">
        <span className="text-pink">Deep</span> <span className="text-teal">Cuts</span>
      </h1>
      <p className="max-w-xl text-lg text-foreground-muted">
        Spotify&apos;s &ldquo;made for you&rdquo; keeps handing back songs you already know.
        Pick some genres, moods, or artists, tell us how deep to dig, and
        we&apos;ll surface the stuff it won&apos;t — no login required.
      </p>
      <Link
        href="/questionnaire"
        className="mt-4 inline-block rounded-full px-8 py-3 font-display text-2xl text-background
                   bg-gradient-to-r from-teal-strong to-purple-strong
                   shadow-[0_0_24px_rgba(0,229,204,0.3)]
                   transition-transform hover:scale-[1.03] active:scale-[0.98]"
      >
        Get started
      </Link>
    </main>
  );
}
