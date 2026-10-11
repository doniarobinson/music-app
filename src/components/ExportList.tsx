"use client";

import { useState } from "react";
import { Accordion } from "@base-ui/react/accordion";
import type { DiscoveryResult } from "@/lib/discovery/types";

export function formatResultsAsText(results: DiscoveryResult[]): string {
  return results.map((r) => `${r.artistName} - ${r.trackName}`).join("\n");
}

function downloadFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `deep-cuts-${stamp}.txt`;
}

export function downloadResultsAsText(results: DiscoveryResult[]) {
  const blob = new Blob([formatResultsAsText(results)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadFilename();
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportList({ results }: { results: DiscoveryResult[] }) {
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const text = formatResultsAsText(results);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    setTimeout(() => setCopyStatus("idle"), 2000);
  }

  return (
    <div className="text-sm">
      <Accordion.Root value={open ? ["list"] : []} onValueChange={(value) => setOpen(value.includes("list"))}>
        <Accordion.Item value="list">
          <Accordion.Header>
            <Accordion.Trigger className="text-teal underline hover:no-underline">
              {open ? "Hide list" : "View list as text"}
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>
            <div className="mt-3 rounded-xl bg-surface p-4">
              <pre className="whitespace-pre-wrap break-words text-foreground text-sm">{text}</pre>
              <button
                type="button"
                onClick={handleCopy}
                className="mt-3 rounded-full px-3 py-1 text-sm bg-teal-strong text-background"
              >
                {copyStatus === "idle" && "Copy"}
                {copyStatus === "copied" && "Copied!"}
                {copyStatus === "failed" && "Couldn't copy — select the text manually"}
              </button>
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
