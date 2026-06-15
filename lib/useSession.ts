"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT } from "@/lib/product";
import { computeMetrics } from "@/lib/metrics";
import type { ActionEvent, AdaptContext, Card, CardRecord } from "@/types";

type Phase = "intro" | "feed" | "converted";

export function useSession() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [records, setRecords] = useState<CardRecord[]>([]);
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const sessionStart = useRef<number>(Date.now());
  const cardShownAt = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);

  const current = records[records.length - 1] ?? null;
  const currentIndex = records.length - 1;

  const since = useCallback(() => Date.now() - sessionStart.current, []);

  const logEvent = useCallback(
    (e: Omit<ActionEvent, "at">) => {
      setEvents((prev) => [...prev, { ...e, at: since() }]);
    },
    [since]
  );

  // Commit accumulated dwell + scroll to the current record.
  const flushDwell = useCallback(() => {
    const dwell = Date.now() - cardShownAt.current;
    const depth = scrollDepthRef.current;
    setRecords((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      last.dwellMs += dwell;
      last.scrollDepth = Math.max(last.scrollDepth, depth);
      next[next.length - 1] = last;
      return next;
    });
    return dwell;
  }, []);

  const buildContext = useCallback(
    (recs: CardRecord[]): AdaptContext => {
      const anglesUsed = recs.map((r) => String(r.card.angle));
      const dwells = recs.map((r) => r.dwellMs);
      return {
        product: { name: PRODUCT.name, tagline: PRODUCT.tagline, cta: PRODUCT.cta },
        history: recs.map((r) => ({
          angle: String(r.card.angle),
          headline: r.card.headline,
          dwellMs: r.dwellMs,
          scrollDepth: r.scrollDepth,
          requestedAnother: r.requestedAnother,
        })),
        anglesUsed,
        stats: {
          cardsSeen: recs.length,
          avgDwellMs: dwells.length ? dwells.reduce((a, b) => a + b, 0) / dwells.length : 0,
          fastestRejectMs: dwells.length ? Math.min(...dwells) : null,
          slowestDwellMs: dwells.length ? Math.max(...dwells) : null,
        },
      };
    },
    []
  );

  const fetchCard = useCallback(async (ctx: AdaptContext): Promise<Card> => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ctx),
    });
    const data = await res.json();
    return data.card as Card;
  }, []);

  const pushCard = useCallback((card: Card) => {
    cardShownAt.current = Date.now();
    scrollDepthRef.current = 0;
    setRecords((prev) => [
      ...prev,
      { card, shownAt: Date.now() - sessionStart.current, dwellMs: 0, scrollDepth: 0, requestedAnother: false, clickedCta: false },
    ]);
  }, []);

  const begin = useCallback(async () => {
    setPhase("feed");
    setLoading(true);
    sessionStart.current = Date.now();
    const card = await fetchCard(buildContext([]));
    pushCard(card);
    logEvent({ type: "view", cardIndex: 0, angle: String(card.angle) });
    setLoading(false);
  }, [buildContext, fetchCard, pushCard, logEvent]);

  const requestAnother = useCallback(async () => {
    if (loading || !current) return;
    setLoading(true);
    const dwell = Date.now() - cardShownAt.current;
    const depth = scrollDepthRef.current;
    logEvent({
      type: "request_another",
      cardIndex: currentIndex,
      angle: String(current.card.angle),
      dwellMs: dwell,
    });
    // Commit dwell + scroll and mark the current card as having requested another (single update).
    const updated = records.map((r, i) =>
      i === records.length - 1
        ? {
            ...r,
            requestedAnother: true,
            dwellMs: r.dwellMs + dwell,
            scrollDepth: Math.max(r.scrollDepth, depth),
          }
        : r
    );
    setRecords(updated);
    const card = await fetchCard(buildContext(updated));
    pushCard(card);
    logEvent({ type: "view", cardIndex: updated.length, angle: String(card.angle) });
    setLoading(false);
  }, [loading, current, currentIndex, logEvent, records, buildContext, fetchCard, pushCard]);

  const clickCta = useCallback(() => {
    if (!current) return;
    const dwell = flushDwell();
    logEvent({
      type: "cta_click",
      cardIndex: currentIndex,
      angle: String(current.card.angle),
      dwellMs: dwell,
    });
    setPhase("converted");
  }, [current, currentIndex, flushDwell, logEvent]);

  const setScrollDepth = useCallback((depth: number) => {
    scrollDepthRef.current = Math.max(scrollDepthRef.current, depth);
  }, []);

  const restart = useCallback(() => {
    setRecords([]);
    setEvents([]);
    setPhase("intro");
  }, []);

  // Log a "leave" on tab close / navigation away.
  useEffect(() => {
    const onLeave = () => {
      if (phase === "feed" && current) {
        const dwell = Date.now() - cardShownAt.current;
        setEvents((prev) => [
          ...prev,
          {
            type: "leave",
            cardIndex: records.length - 1,
            angle: String(current.card.angle),
            at: Date.now() - sessionStart.current,
            dwellMs: dwell,
          },
        ]);
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase, current, records.length]);

  const metrics = useMemo(
    () => computeMetrics(records, events, sessionStart.current, Date.now()),
    [records, events]
  );

  const exportJson = useCallback(() => {
    const payload = {
      product: PRODUCT,
      sessionStart: new Date(sessionStart.current).toISOString(),
      records,
      events,
      metrics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acf-session-${sessionStart.current}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records, events, metrics]);

  return {
    phase,
    records,
    current,
    currentIndex,
    loading,
    metrics,
    begin,
    requestAnother,
    clickCta,
    setScrollDepth,
    restart,
    exportJson,
  };
}
