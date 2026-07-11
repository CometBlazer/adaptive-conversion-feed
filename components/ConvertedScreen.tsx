"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MetricsView } from "@/components/MetricsView";
import type { SessionMetrics } from "@/lib/metrics";
import type { SessionProfile } from "@/lib/gemini";
import { PRODUCT } from "@/lib/product";

export function ConvertedScreen({
  metrics,
  profile,
  profileLoading,
  onRestart,
  onExport,
  showMetricsOption,
}: {
  metrics: SessionMetrics;
  profile: SessionProfile | null;
  profileLoading: boolean;
  onRestart: () => void;
  onExport: () => void;
  showMetricsOption: boolean;
}) {
  const [showMetrics, setShowMetrics] = useState(false);
  const cardsBefore = metrics.cardsViewedBeforeCta ?? metrics.cardsViewed;
  const angle = metrics.ctaAngle;

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss/15">
          <Check className="h-6 w-6 text-moss" />
        </div>
        <h2 className="mt-5 font-display text-4xl text-ink sm:text-5xl">Converted.</h2>
        <p className="mt-3 max-w-md text-slatey">
          It took {cardsBefore} {cardsBefore === 1 ? "card" : "cards"}
          {angle ? ` — the one that landed used the ${angle.replace(/_/g, " ")} angle.` : "."}
        </p>
        <p className="mt-2 font-mono text-xs text-slatey">
          ({PRODUCT.name} is fictional. Nothing was purchased.)
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="lg" onClick={onRestart}>
            Run another session
          </Button>
          {showMetricsOption && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowMetrics((v) => !v)}
              disabled={profileLoading}
            >
              {profileLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Compiling…
                </>
              ) : showMetrics ? (
                "Hide metrics"
              ) : (
                "View metrics"
              )}
            </Button>
          )}
        </div>
      </div>

      {showMetricsOption && showMetrics && !profileLoading && (
        <div className="mt-12 w-full">
          <MetricsView metrics={metrics} profile={profile} onExport={onExport} />
        </div>
      )}
    </div>
  );
}