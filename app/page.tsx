"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { useSession } from "@/lib/useSession";
import { IntroScreen } from "@/components/IntroScreen";
import { PitchCard } from "@/components/PitchCard";
import { LoadingCard } from "@/components/LoadingCard";
import { ConvertedScreen } from "@/components/ConvertedScreen";
import { EndScreen } from "@/components/EndScreen";
import { ResearchDashboard } from "@/components/ResearchDashboard";
import { PRODUCT } from "@/lib/product";

// const IS_DEV = process.env.NODE_ENV !== "production";
const IS_DEV = true; 

export default function Home() {
  const s = useSession();
  const feedRef = useRef<HTMLDivElement>(null);

  return (
    <main className="relative">
      {s.phase === "feed" && (
        <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-transparent px-6 py-4">
          <span className="font-display text-lg text-ink">{PRODUCT.name}</span>
          <button
            onClick={s.close}
            aria-label="Close experiment"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slatey transition hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
      )}

      {s.phase === "intro" && <IntroScreen onBegin={s.begin} />}

      {s.phase === "feed" && (
        <div ref={feedRef} className="h-[100svh] snap-y snap-mandatory overflow-y-scroll">
          {s.records.map((r, i) => (
            <PitchCard
              key={i}
              card={r.card}
              index={i}
              onCta={s.clickCta}
              onScroll={s.onScroll}
              onActive={s.setActiveCard}
            />
          ))}
          {s.prefetching && <LoadingCard index={s.records.length} onActive={s.onLoadingActive} />}
        </div>
      )}

      {s.phase === "converted" && (
        <ConvertedScreen
          metrics={s.metrics}
          profile={s.profile}
          profileLoading={s.profileLoading}
          onRestart={s.restart}
          onExport={s.exportJson}
          showMetricsOption={IS_DEV}
        />
      )}

      {s.phase === "ended" && (
        <EndScreen
          metrics={s.metrics}
          profile={s.profile}
          profileLoading={s.profileLoading}
          onExport={s.exportJson}
          onRestart={s.restart}
          showMetricsOption={IS_DEV}
        />
      )}

      {IS_DEV && (
        <ResearchDashboard
          metrics={s.metrics}
          latestCard={s.records[s.records.length - 1]?.card ?? null}
          onExport={s.exportJson}
        />
      )}
    </main>
  );
}