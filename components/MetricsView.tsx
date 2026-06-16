// components/MetricsView.tsx
"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { FullJsonBlock } from "@/components/FullJsonBlock";
import { PRODUCT } from "@/lib/product";
import type { SessionMetrics, StepOutcome } from "@/lib/metrics";
import type { SessionProfile } from "@/lib/gemini";

function ms(n: number | null): string {
  if (n === null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`;
}

const OUTCOME_LABEL: Record<StepOutcome, string> = {
  advanced: "Scrolled down",
  scrolled_back_away: "Scrolled away",
  signed_up: "Signed up",
  closed: "Closed (X / tab)",
  still_viewing: "Still viewing",
};

const OUTCOME_HUE: Record<StepOutcome, string> = {
  advanced: "#3A5BE0",
  scrolled_back_away: "#B5762A",
  signed_up: "#4C6B4F",
  closed: "#D9531E",
  still_viewing: "#6B6358",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-ink/[0.04] px-3 py-2 text-left">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slatey">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-ink">{value}</div>
    </div>
  );
}

export function MetricsView({
  metrics,
  profile,
  onExport,
}: {
  metrics: SessionMetrics;
  profile?: SessionProfile | null;
  onExport: () => void;
}) {
  const [openStep, setOpenStep] = useState<number | null>(null);

  const fullPayload = {
    product: PRODUCT,
    metrics,
    reflection_summary: profile ?? null,
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-left">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Converted" value={metrics.ctaConverted ? "yes" : "no"} />
        <Stat label="Cards before CTA" value={metrics.cardsViewedBeforeCta ?? "—"} />
        <Stat label="Sections viewed" value={metrics.cardsViewed} />
        <Stat label="Session" value={ms(metrics.sessionLengthMs)} />
        <Stat label="Avg / section" value={ms(metrics.avgTimePerCardMs)} />
        <Stat label="Median / section" value={ms(metrics.medianTimePerCardMs)} />
        <Stat label="Longest dwell" value={ms(metrics.longestDwellMs)} />
        <Stat label="Avg read depth" value={metrics.avgScrollDepth.toFixed(2)} />
        <Stat label="Advances" value={metrics.advanceCount} />
        <Stat label="Quick (bounced)" value={metrics.quickAdvanceCount} />
        <Stat label="Engaged (read on)" value={metrics.engagedAdvanceCount} />
        <Stat label="Scroll-backs" value={metrics.scrollBackCount} />
        <Stat label="Revisited" value={metrics.revisitedCardCount} />
        <Stat label="CTA angle" value={metrics.ctaAngle ?? "—"} />
      </div>

      {profile && (
        <div className="mt-7">
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ember">
            Session profile
          </h3>
          <div className="space-y-3 rounded-xl border border-mist bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink">
            <p>{profile.summary}</p>
            {profile.traits.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-slatey">
                {profile.traits.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 font-mono text-[11px] text-slatey sm:grid-cols-2">
              <div><span className="text-ink">What worked: </span>{profile.what_worked}</div>
              <div><span className="text-ink">What didn&apos;t: </span>{profile.what_didnt}</div>
              <div className="sm:col-span-2">
                <span className="text-ink">Converting factor: </span>{profile.converting_factor}
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 className="mb-2 mt-7 font-mono text-[11px] uppercase tracking-[0.16em] text-ember">
        Step-by-step ({metrics.timeline.length})
      </h3>
      <div className="space-y-2">
        {metrics.timeline.map((s) => {
          const open = openStep === s.step;
          const hue = OUTCOME_HUE[s.outcome];
          return (
            <div key={s.step} className="overflow-hidden rounded-xl border border-mist bg-white/70">
              <button
                onClick={() => setOpenStep(open ? null : s.step)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs text-paper">
                    {s.step}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-display text-base text-ink">{s.headline}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-slatey">
                      {s.angle.replace(/_/g, " ")}
                      {s.visitOrder > 1 ? ` · revisit ${s.visitOrder}` : ""}
                      {` · in ${s.arrivedBy}`}
                      {s.leftBy ? ` · out ${s.leftBy}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs text-slatey">{ms(s.dwellMs)}</span>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[10px]"
                    style={{ color: hue, backgroundColor: `${hue}1a` }}
                  >
                    {OUTCOME_LABEL[s.outcome]}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slatey transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              {open && (
                <div className="border-t border-mist bg-ink/[0.02] px-4 py-3">
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink/80">
{JSON.stringify(
  {
    step: s.step,
    order_shown: s.cardIndex + 1,
    visit: s.visitOrder,
    angle: s.angle,
    arrived_by: s.arrivedBy,
    headline: s.headline,
    subheadline: s.subheadline,
    body: s.body,
    dwell_ms: Math.round(s.dwellMs),
    outcome: s.outcome,
    left_by: s.leftBy,
    pre_load_inferred_user_state: s.pre_load_inferred_user_state,
    pre_load_reasoning_summary: s.pre_load_reasoning_summary,
    pre_load_analysis: s.pre_load_analysis,
    pre_load_avoided: s.pre_load_avoided,
    post_action_reflection: s.post_action_reflection,
  },
  null,
  2
)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <FullJsonBlock payload={fullPayload} />
        <button
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 font-mono text-xs text-paper transition hover:bg-ink/90"
        >
          <Download className="h-3.5 w-3.5" />
          Export full session JSON
        </button>
      </div>
    </div>
  );
}