"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

// Collapsible "full JSON" panel with a copy-to-clipboard button.
// `payload` is any serializable object; it's stringified here so callers
// don't each re-implement formatting.
export function FullJsonBlock({
  payload,
  compact = false,
}: {
  payload: unknown;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(payload, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Fallback for non-secure contexts where the Clipboard API is blocked.
      const ta = document.createElement("textarea");
      ta.value = json;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-mist bg-ink/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slatey">
          Full JSON
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slatey transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-mist">
          <div className="flex items-center justify-end px-3 pt-2">
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] text-paper transition hover:bg-ink/90"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <pre
            className={`overflow-auto px-3 py-2 font-mono leading-relaxed text-ink/80 ${
              compact ? "max-h-64 text-[10px]" : "max-h-96 text-[11px]"
            }`}
          >
            {json}
          </pre>
        </div>
      )}
    </div>
  );
}