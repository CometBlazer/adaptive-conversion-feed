"use client";

import { AnimatePresence } from "framer-motion";
import { useSession } from "@/lib/useSession";
import { IntroScreen } from "@/components/IntroScreen";
import { PitchCard } from "@/components/PitchCard";
import { ConvertedScreen } from "@/components/ConvertedScreen";
import { ResearchDashboard } from "@/components/ResearchDashboard";

const IS_DEV = process.env.NODE_ENV !== "production";

export default function Home() {
  const s = useSession();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="stage-grid absolute inset-0 -z-10" />

      {/* quiet header */}
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-display text-lg text-ink">FocusFlow</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slatey">
          adaptive feed
        </span>
      </header>

      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-16">
        <AnimatePresence mode="wait">
          {s.phase === "intro" && <IntroScreen key="intro" onBegin={s.begin} />}

          {s.phase === "feed" && s.current && (
            <PitchCard
              key={`card-${s.currentIndex}`}
              card={s.current.card}
              index={s.currentIndex}
              loading={s.loading}
              onCta={s.clickCta}
              onAnother={s.requestAnother}
              onScroll={s.setScrollDepth}
            />
          )}

          {s.phase === "converted" && (
            <ConvertedScreen
              key="converted"
              cardsBefore={s.metrics.cardsViewedBeforeCta ?? s.metrics.cardsViewed}
              angle={s.metrics.ctaAngle}
              onRestart={s.restart}
            />
          )}
        </AnimatePresence>
      </div>

      {IS_DEV && s.phase !== "intro" && (
        <ResearchDashboard
          metrics={s.metrics}
          latestCard={s.current?.card ?? null}
          onExport={s.exportJson}
        />
      )}
    </main>
  );
}
