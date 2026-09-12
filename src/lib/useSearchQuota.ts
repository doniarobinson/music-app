"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Self-imposed daily cap on discover-API calls, purely to keep the iTunes
 * Search API's per-source-IP rate limit from tripping — there's no login or
 * server-side state in this app, so it's tracked client-side in
 * localStorage (per-browser, not a real enforced limit) and never blocks
 * searching, just displays where things stand.
 */
const DAILY_SEARCH_LIMIT = 10;
const STORAGE_KEY = "deepcuts:dailySearchQuota";

interface QuotaState {
  date: string;
  used: number;
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readQuota(): QuotaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QuotaState;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch {
    // fall through to a fresh state for today
  }
  return { date: todayKey(), used: 0 };
}

function writeQuota(state: QuotaState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort only — the count just won't persist
  }
}

export function useSearchQuota() {
  // null until the first client-side read, so we don't flash a wrong number
  // before localStorage has been checked (and so SSR/hydration don't fight).
  const [remaining, setRemaining] = useState<number | null>(null);

  const refresh = useCallback(() => {
    setRemaining(Math.max(0, DAILY_SEARCH_LIMIT - readQuota().used));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading external state (localStorage) on mount, not derived from props/state
    refresh();
    // Re-checks "today" periodically so the count resets on its own if the
    // tab is left open across midnight, without needing a page refresh.
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const recordSearch = useCallback(() => {
    const state = readQuota();
    const next = { date: state.date, used: state.used + 1 };
    writeQuota(next);
    setRemaining(Math.max(0, DAILY_SEARCH_LIMIT - next.used));
  }, []);

  return { remaining, dailyLimit: DAILY_SEARCH_LIMIT, recordSearch };
}
