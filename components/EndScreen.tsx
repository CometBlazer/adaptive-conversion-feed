// components/EndScreen.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MetricsView } from "@/components/MetricsView";
import type { SessionMetrics } from "@/lib/metrics";
import type { SessionProfile } from "@/lib/gemini";

export function EndScreen({
  metrics,
  profile,
  profileLoading,
  onExport,
  onRestart,
  showMetricsOption,
}: {
  metrics: SessionMetrics;
  profile: SessionProfile | null;
  profileLoading: boolean;
  onExport: () => void;
  onRestart: () => void;
  showMetricsOption: boolean;
}) {
  const [showMetrics, setShowMetrics] = useState(false);

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex flex-col items-center">
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
                "Hide research metrics"
              ) : (
                "View research metrics"
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