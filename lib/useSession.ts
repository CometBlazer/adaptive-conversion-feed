// lib/useSession.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT } from "@/lib/product";
import { computeMetrics } from "@/lib/metrics";
import type { ActionEvent, AdaptContext, Card, CardRecord } from "@/types";

type Phase = "intro" | "feed" | "converted" | "ended";

export function useSession() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [records, setRecords] = useState<CardRecord[]>([]);
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [prefetching, setPrefetching] = useState(false);

  const sessionStart = useRef<number>(Date.now());
  const visibleSince = useRef<Record<number, number>>({});
  const scrollDepth = useRef<Record<number, number>>({});
  const activeIndex = useRef<number>(0);
  const generating = useRef(false);

  const since = useCallback(() => Date.now() - sessionStart.current, []);

  const logEvent = useCallback(
    (e: Omit<ActionEvent, "at">) => {
      setEvents((prev) => [...prev, { ...e, at: since() }]);
    },
    [since]
  );

  const buildContext = useCallback((recs: CardRecord[]): AdaptContext => {
    const anglesUsed = recs.map((r) => String(r.card.angle));
    const dwells = recs.map((r) => r.dwellMs);
    return {
      product: { name: PRODUCT.name, tagline: PRODUCT.tagline, cta: PRODUCT.cta },
      history: recs.map((r) => ({
        angle: String(r.card.angle),
        headline: r.card.headline,
        dwellMs: r.dwellMs,
        scrollDepth: r.scrollDepth,
        revisited: r.visits > 1,
      })),
      anglesUsed,
      stats: {
        cardsSeen: recs.length,
        avgDwellMs: dwells.length ? dwells.reduce((a, b) => a + b, 0) / dwells.length : 0,
        shortestDwellMs: dwells.length ? Math.min(...dwells) : null,
        longestDwellMs: dwells.length ? Math.max(...dwells) : null,
      },
    };
  }, []);

  const fetchCard = useCallback(async (ctx: AdaptContext): Promise<Card> => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ctx),
    });
    const data = await res.json();
    return data.card as Card;
  }, []);

  const appendCard = useCallback((card: Card) => {
    setRecords((prev) => [
      ...prev,
      {
        card,
        shownAt: Date.now() - sessionStart.current,
        dwellMs: 0,
        scrollDepth: 0,
        visits: 0,
        clickedCta: false,
      },
    ]);
  }, []);

  const prefetchNext = useCallback(async () => {
    if (generating.current) return;
    generating.current = true;
    setPrefetching(true);
    let snapshot: CardRecord[] = [];
    setRecords((prev) => {
      snapshot = prev;
      return prev;
    });
    const card = await fetchCard(buildContext(snapshot));
    appendCard(card);
    generating.current = false;
    setPrefetching(false);
  }, [buildContext, fetchCard, appendCard]);

  const begin = useCallback(async () => {
    setPhase("feed");
    sessionStart.current = Date.now();
    generating.current = true;
    setPrefetching(true);
    const card = await fetchCard(buildContext([]));
    appendCard(card);
    generating.current = false;
    setPrefetching(false);
  }, [buildContext, fetchCard, appendCard]);

  const commitDwell = useCallback((index: number) => {
    const start = visibleSince.current[index];
    if (start == null) return;
    const dwell = Date.now() - start;
    delete visibleSince.current[index];
    const depth = scrollDepth.current[index] ?? 0;
    setRecords((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = {
        ...next[index],
        dwellMs: next[index].dwellMs + dwell,
        scrollDepth: Math.max(next[index].scrollDepth, depth),
      };
      return next;
    });
  }, []);

  const onVisible = useCallback(
    (index: number) => {
      if (visibleSince.current[index] != null) return;
      visibleSince.current[index] = Date.now();
      activeIndex.current = index;
      setRecords((prev) => {
        if (!prev[index]) return prev;
        const next = [...prev];
        const wasVisited = next[index].visits > 0;
        next[index] = { ...next[index], visits: next[index].visits + 1 };
        logEvent({
          type: wasVisited ? "scroll_back" : "view",
          cardIndex: index,
          angle: String(next[index].card.angle),
        });
        return next;
      });
      setRecords((prev) => {
        if (index === prev.length - 1) void prefetchNext();
        return prev;
      });
    },
    [logEvent, prefetchNext]
  );

  const onHidden = useCallback(
    (index: number, direction: "up" | "down") => {
      const start = visibleSince.current[index];
      const dwell = start != null ? Date.now() - start : 0;
      commitDwell(index);
      // Advancing downward is logged neutrally (engaged vs quick is derived from dwell).
      if (direction === "down") {
        logEvent({
          type: "advance",
          cardIndex: index,
          angle: String(records[index]?.card.angle ?? ""),
          dwellMs: dwell,
        });
      }
    },
    [commitDwell, logEvent, records]
  );

  const onScroll = useCallback((index: number, depth: number) => {
    scrollDepth.current[index] = Math.max(scrollDepth.current[index] ?? 0, depth);
  }, []);

  const clickCta = useCallback(
    (index: number) => {
      commitDwell(index);
      logEvent({
        type: "cta_click",
        cardIndex: index,
        angle: String(records[index]?.card.angle ?? ""),
      });
      setPhase("converted");
    },
    [commitDwell, logEvent, records]
  );

  // X button: log a leave against the active section, then show the end screen.
  const close = useCallback(() => {
    const idx = activeIndex.current;
    const start = visibleSince.current[idx];
    const dwell = start != null ? Date.now() - start : 0;
    commitDwell(idx);
    logEvent({
      type: "leave",
      cardIndex: idx,
      angle: String(records[idx]?.card.angle ?? ""),
      dwellMs: dwell,
    });
    setPhase("ended");
  }, [commitDwell, logEvent, records]);

  const restart = useCallback(() => {
    setRecords([]);
    setEvents([]);
    visibleSince.current = {};
    scrollDepth.current = {};
    activeIndex.current = 0;
    setPhase("intro");
  }, []);

  // Tab close still logs a leave (best-effort).
  useEffect(() => {
    const onLeave = () => {
      if (phase !== "feed") return;
      const idx = activeIndex.current;
      const start = visibleSince.current[idx];
      const dwell = start != null ? Date.now() - start : 0;
      setEvents((prev) => [
        ...prev,
        {
          type: "leave",
          cardIndex: idx,
          angle: String(records[idx]?.card.angle ?? ""),
          at: Date.now() - sessionStart.current,
          dwellMs: dwell,
        },
      ]);
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase, records]);

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
    prefetching,
    metrics,
    begin,
    onVisible,
    onHidden,
    onScroll,
    clickCta,
    close,
    restart,
    exportJson,
  };
}