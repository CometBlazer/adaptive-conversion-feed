"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Download, X } from "lucide-react";
import type { Card } from "@/types";
import type { SessionMetrics } from "@/lib/metrics";

function ms(n: number | null): string {
  if (n === null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-ink/[0.03] px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slatey">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-ink">{value}</div>
    </div>
  );
}

export function ResearchDashboard({
  metrics,
  latestCard,
  onExport,
}: {
  metrics: SessionMetrics;
  latestCard: Card | null;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-mist bg-white text-ink shadow-lg transition hover:bg-mist/40"
        aria-label="Toggle research dashboard"
      >
        <Activity className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className="fixed right-0 top-0 z-40 flex h-full w-[340px] flex-col border-l border-mist bg-paper/98 backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-mist px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-ember">
                  Research panel
                </span>
                <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slatey">
                  dev
                </span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close panel">
                <X className="h-4 w-4 text-slatey" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slatey">
                  Primary
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    label="Cards before CTA"
                    value={metrics.cardsViewedBeforeCta ?? "—"}
                  />
                  <Stat label="Converted" value={metrics.ctaConverted ? "yes" : "no"} />
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slatey">
                  Secondary
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Cards viewed" value={metrics.cardsViewed} />
                  <Stat label="Session" value={ms(metrics.sessionLengthMs)} />
                  <Stat label="Avg / card" value={ms(metrics.avgTimePerCardMs)} />
                  <Stat label="Median / card" value={ms(metrics.medianTimePerCardMs)} />
                  <Stat label="Fastest reject" value={ms(metrics.fastestRejectMs)} />
                  <Stat label="Slowest dwell" value={ms(metrics.slowestDwellMs)} />
                  <Stat label="Avg scroll" value={metrics.avgScrollDepth.toFixed(2)} />
                  <Stat label="Re-requests" value={metrics.requestAnotherCount} />
                  <Stat
                    label="Drop-off card"
                    value={metrics.dropOffCardIndex === null ? "—" : metrics.dropOffCardIndex + 1}
                  />
                  <Stat label="CTA angle" value={metrics.ctaAngle ?? "—"} />
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slatey">
                  Angles used ({metrics.anglesUsed.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.anglesUsed.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-ink/[0.05] px-2 py-0.5 font-mono text-[10px] text-ink"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slatey">
                  Dwell by angle
                </h3>
                <div className="space-y-1">
                  {Object.entries(metrics.dwellByAngle).map(([angle, d]) => (
                    <div
                      key={angle}
                      className="flex items-center justify-between rounded bg-ink/[0.03] px-2 py-1 font-mono text-[11px]"
                    >
                      <span className="text-ink">{angle}</span>
                      <span className="text-slatey">
                        {ms(d.avgDwellMs)} · ×{d.count} · scroll {d.avgScroll.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {latestCard && (
                <section>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slatey">
                    Model inference
                  </h3>
                  <div className="space-y-2 rounded-lg bg-ink/[0.03] px-3 py-2.5 text-xs leading-relaxed">
                    <div>
                      <span className="text-slatey">Inferred state: </span>
                      <span className="text-ink">{latestCard.inferred_user_state}</span>
                    </div>
                    <div>
                      <span className="text-slatey">Why this angle: </span>
                      <span className="text-ink">{latestCard.reasoning_summary}</span>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="border-t border-mist p-3">
              <button
                onClick={onExport}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 font-mono text-xs text-paper transition hover:bg-ink/90"
              >
                <Download className="h-3.5 w-3.5" />
                Export session JSON
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
