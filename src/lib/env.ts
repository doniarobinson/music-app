import { z } from "zod";

const envSchema = z.object({
  LASTFM_API_KEY: z.string().min(1, "LASTFM_API_KEY is required"),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Lazily validates required server env vars on first use, throwing a clear
 * error instead of an obscure `undefined` failure deep in a fetch call.
 * Never import this from a client component — it reads a server-only key.
 * (Deezer's public API needs no key at all.)
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid/missing environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
