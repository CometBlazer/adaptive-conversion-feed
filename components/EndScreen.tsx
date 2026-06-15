// components/EndScreen.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MetricsView } from "@/components/MetricsView";
import type { SessionMetrics } from "@/lib/metrics";

export function EndScreen({
  metrics,
  onExport,
  onRestart,
  showMetricsOption,
}: {
  metrics: SessionMetrics;
  onExport: () => void;
  onRestart: () => void;
  showMetricsOption: boolean;
}) {
  const [showMetrics, setShowMetrics] = useState(false);

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-ember">Session ended</p>
        <h1 className="mt-5 font-display text-5xl text-ink sm:text-6xl">Experiment complete.</h1>
        <p className="mt-5 max-w-md text-lg text-slatey">
          Thanks for taking part. Nothing you did was tied to your identity, and the record stays in
          your browser.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="lg" onClick={onRestart}>
            Run another session
          </Button>
          {showMetricsOption && (
            <Button variant="ghost" size="lg" onClick={() => setShowMetrics((v) => !v)}>
              {showMetrics ? "Hide" : "View"} research dashboard
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