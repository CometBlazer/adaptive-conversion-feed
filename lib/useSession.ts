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
  const activeIndex = useRef<number>(-1); // which card currently counts as "open"
  const generating = useRef(false);
  const terminal = useRef(false);

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
    if (generating.current || terminal.current) return;
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
    terminal.current = false;
    activeIndex.current = -1;
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
      if (terminal.current) return;
      // Dedupe: ignore a repeat "visible" for the card that's already open.
      // This kills the Strict-Mode / fast-prefetch double-fire that duplicated steps.
      if (activeIndex.current === index) return;
      if (visibleSince.current[index] != null) return;

      const direction: "up" | "down" =
        activeIndex.current === -1 || index > activeIndex.current ? "down" : "up";

      visibleSince.current[index] = Date.now();
      const prevActive = activeIndex.current;
      activeIndex.current = index;

      setRecords((prev) => {
        if (!prev[index]) return prev;
        const next = [...prev];
        const wasVisited = next[index].visits > 0;
        next[index] = { ...next[index], visits: next[index].visits + 1 };
        // First arrival is a plain "view"; coming back up is a "scroll_back".
        logEvent(
          wasVisited
            ? { type: "scroll_back", cardIndex: index, angle: String(next[index].card.angle), direction: "up" }
            : { type: "view", cardIndex: index, angle: String(next[index].card.angle), direction }
        );
        return next;
      });

      // Prefetch when the last card opens.
      setRecords((prev) => {
        if (index === prev.length - 1) void prefetchNext();
        return prev;
      });

      void prevActive;
    },
    [logEvent, prefetchNext]
  );

  const onHidden = useCallback(
    (index: number, direction: "up" | "down") => {
      if (terminal.current) return;
      const start = visibleSince.current[index];
      const dwell = start != null ? Date.now() - start : 0;
      commitDwell(index);
      if (direction === "down") {
        logEvent({
          type: "advance",
          cardIndex: index,
          angle: String(records[index]?.card.angle ?? ""),
          dwellMs: dwell,
          direction: "down",
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
      if (terminal.current) return;
      terminal.current = true;
      const start = visibleSince.current[index];
      const dwell = start != null ? Date.now() - start : 0;
      commitDwell(index);
      logEvent({
        type: "cta_click",
        cardIndex: index,
        angle: String(records[index]?.card.angle ?? ""),
        dwellMs: dwell,
      });
      setPhase("converted");
    },
    [commitDwell, logEvent, records]
  );

  const close = useCallback(() => {
    if (terminal.current) return;
    terminal.current = true;
    const idx = activeIndex.current >= 0 ? activeIndex.current : 0;
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
    activeIndex.current = -1;
    terminal.current = false;
    setPhase("intro");
  }, []);

  useEffect(() => {
    const onLeave = () => {
      if (phase !== "feed" || terminal.current) return;
      const idx = activeIndex.current >= 0 ? activeIndex.current : 0;
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