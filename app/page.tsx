// app/page.tsx
"use client";

import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSession } from "@/lib/useSession";
import { IntroScreen } from "@/components/IntroScreen";
import { PitchCard } from "@/components/PitchCard";
import { ConvertedScreen } from "@/components/ConvertedScreen";
import { EndScreen } from "@/components/EndScreen";
import { ResearchDashboard } from "@/components/ResearchDashboard";

const IS_DEV = process.env.NODE_ENV !== "production";

export default function Home() {
  const s = useSession();

  return (
    <main className="relative">
      {/* fixed quiet header with the close affordance */}
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
        <div className="h-[100svh] snap-y snap-mandatory overflow-y-scroll">
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
        <div className="flex min-h-[100svh] items-center justify-center px-6">
          <ConvertedScreen
            cardsBefore={s.metrics.cardsViewedBeforeCta ?? s.metrics.cardsViewed}
            angle={s.metrics.ctaAngle}
            onRestart={s.restart}
          />
        </div>
      )}

      {s.phase === "ended" && (
        <EndScreen
          metrics={s.metrics}
          latestCard={s.records[s.records.length - 1]?.card ?? null}
          onExport={s.exportJson}
          onRestart={s.restart}
          showDevOption={IS_DEV}
        />
      )}

      {/* live dashboard during the feed, dev only */}
      {IS_DEV && s.phase === "feed" && (
        <ResearchDashboard
          metrics={s.metrics}
          latestCard={s.records[s.records.length - 1]?.card ?? null}
          onExport={s.exportJson}
        />
      )}
    </main>
  );
}