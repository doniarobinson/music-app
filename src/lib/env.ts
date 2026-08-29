import { z } from "zod";

const envSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is required"),
  SPOTIFY_REDIRECT_URI: z.string().url("SPOTIFY_REDIRECT_URI must be a full URL"),
  LASTFM_API_KEY: z.string().min(1, "LASTFM_API_KEY is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Lazily validates required server env vars on first use, throwing a clear
 * error instead of an obscure `undefined` failure deep in a fetch call.
 * Never import this from a client component — it reads server-only secrets.
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
