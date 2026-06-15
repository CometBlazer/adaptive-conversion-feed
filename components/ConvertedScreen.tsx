// components/ConvertedScreen.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricsView } from "@/components/MetricsView";
import type { SessionMetrics } from "@/lib/metrics";

export function ConvertedScreen({
  metrics,
  onRestart,
  onExport,
  showMetricsOption,
}: {
  metrics: SessionMetrics;
  onRestart: () => void;
  onExport: () => void;
  showMetricsOption: boolean;
}) {
  const [showMetrics, setShowMetrics] = useState(false);
  const cardsBefore = metrics.cardsViewedBeforeCta ?? metrics.cardsViewed;
  const angle = metrics.ctaAngle;

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss/15">
          <Check className="h-6 w-6 text-moss" />
        </div>
        <h2 className="mt-5 font-display text-4xl text-ink sm:text-5xl">Converted.</h2>
        <p className="mt-3 max-w-md text-slatey">
          It took {cardsBefore} {cardsBefore === 1 ? "card" : "cards"}
          {angle ? ` — the one that landed used the ${angle.replace(/_/g, " ")} angle.` : "."}
        </p>
        <p className="mt-2 font-mono text-xs text-slatey">
          (FocusFlow is fictional. Nothing was purchased.)
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="lg" onClick={onRestart}>
            Run another session
          </Button>
          {showMetricsOption && (
            <Button variant="ghost" size="lg" onClick={() => setShowMetrics((v) => !v)}>
              {showMetrics ? "Hide" : "View"} metrics
            </Button>
          )}
        </div>
      </motion.div>

      {showMetricsOption && showMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 w-full"
        >
          <MetricsView metrics={metrics} onExport={onExport} />
        </motion.div>
      )}
    </div>
  );
}