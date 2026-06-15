// app/page.tsx
"use client";

import { useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSession } from "@/lib/useSession";
import { useWheelSnap } from "@/lib/useWheelSnap";
import { IntroScreen } from "@/components/IntroScreen";
import { PitchCard } from "@/components/PitchCard";
import { ConvertedScreen } from "@/components/ConvertedScreen";
import { EndScreen } from "@/components/EndScreen";

const IS_DEV = process.env.NODE_ENV !== "production";

export default function Home() {
  const s = useSession();
  const feedRef = useRef<HTMLDivElement>(null);
  useWheelSnap(feedRef, { durationMs: 650, cooldownMs: 120 });

  return (
    <main className="relative">
      {s.phase === "feed" && (
        <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-paper/60 px-6 py-4 backdrop-blur">
          <span className="font-display text-lg text-ink">FocusFlow</span>
          <button
            onClick={s.close}
            aria-label="Close experiment"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slatey transition hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
      )}

      <AnimatePresence mode="wait">
        {s.phase === "intro" && <IntroScreen key="intro" onBegin={s.begin} />}
      </AnimatePresence>

      {s.phase === "feed" && (
        <div
          ref={feedRef}
          className="h-[100svh] snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {s.records.map((r, i) => (
            <PitchCard
              key={i}
              card={r.card}
              index={i}
              onCta={s.clickCta}
              onScroll={s.onScroll}
              onVisible={s.onVisible}
              onHidden={s.onHidden}
            />
          ))}

          {s.prefetching && (
            <div className="flex h-24 items-center justify-center font-mono text-xs text-slatey">
              finding another angle…
            </div>
          )}
        </div>
      )}

      {s.phase === "converted" && (
        <ConvertedScreen
          metrics={s.metrics}
          onRestart={s.restart}
          onExport={s.exportJson}
          showMetricsOption={IS_DEV}
        />
      )}

      {s.phase === "ended" && (
        <EndScreen
          metrics={s.metrics}
          onExport={s.exportJson}
          onRestart={s.restart}
          showMetricsOption={IS_DEV}
        />
      )}
    </main>
  );
}