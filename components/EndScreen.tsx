// components/EndScreen.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ResearchDashboard } from "@/components/ResearchDashboard";
import type { Card } from "@/types";
import type { SessionMetrics } from "@/lib/metrics";

export function EndScreen({
  metrics,
  latestCard,
  onExport,
  onRestart,
  showDevOption,
}: {
  metrics: SessionMetrics;
  latestCard: Card | null;
  onExport: () => void;
  onRestart: () => void;
  showDevOption: boolean;
}) {
  const [showDash, setShowDash] = useState(false);

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: "easeOut" }}
      >
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-ember">
          Session ended
        </p>
        <h1 className="mt-5 font-display text-5xl text-ink sm:text-6xl">Experiment complete.</h1>
        <p className="mt-5 max-w-md text-lg text-slatey">
          Thanks for taking part. Nothing you did was tied to your identity, and the record stays in
          your browser.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="lg" onClick={onRestart}>
            Run another session
          </Button>
          {showDevOption && (
            <Button variant="ghost" size="lg" onClick={() => setShowDash((v) => !v)}>
              {showDash ? "Hide" : "View"} research dashboard
            </Button>
          )}
        </div>
      </motion.div>

      {showDevOption && showDash && (
        <ResearchDashboard
          metrics={metrics}
          latestCard={latestCard}
          onExport={onExport}
          startOpen
        />
      )}
    </div>
  );
}