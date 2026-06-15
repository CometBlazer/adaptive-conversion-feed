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
  const scrollDepth = useRef<Record<number, number>>({});
  const activeIndex = useRef<number>(-1); // the card currently on screen
  const activeSince = useRef<number>(0);  // when the active card became active
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
    activeSince.current = 0;
    setPhase("feed");
    sessionStart.current = Date.now();
    generating.current = true;
    setPrefetching(true);
    const card = await fetchCard(buildContext([]));
    appendCard(card);
    generating.current = false;
    setPrefetching(false);
  }, [buildContext, fetchCard, appendCard]);

  // Commit accumulated dwell to a card's record.
  const addDwell = useCallback((index: number, dwell: number) => {
    if (dwell <= 0) return;
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

  // Single source of truth: the feed tells us which card is now the active one.
  // We close out the previously-active card (dwell + exit direction) and open
  // the new one (view or scroll_back, with arrival direction).
  const setActiveCard = useCallback(
    (index: number) => {
      if (terminal.current) return;
      const prev = activeIndex.current;
      if (prev === index) return; // already active, nothing to do

      const now = Date.now();

      // Close the previous card.
      if (prev !== -1) {
        const dwell = now - activeSince.current;
        addDwell(prev, dwell);
        const exitDir: "up" | "down" = index > prev ? "down" : "up";
        if (exitDir === "down") {
          logEvent({
            type: "advance",
            cardIndex: prev,
            angle: String(records[prev]?.card.angle ?? ""),
            dwellMs: dwell,
            direction: "down",
          });
        }
        // (upward exit is implied by the next card's scroll_back arrival)
      }

      // Open the new card.
      const arriveDir: "up" | "down" | "start" =
        prev === -1 ? "start" : index > prev ? "down" : "up";

      let isRevisit = false;
      setRecords((p) => {
        if (!p[index]) return p;
        const next = [...p];
        isRevisit = next[index].visits > 0;
        next[index] = { ...next[index], visits: next[index].visits + 1 };
        return next;
      });

      logEvent(
        isRevisit
          ? {
              type: "scroll_back",
              cardIndex: index,
              angle: String(records[index]?.card.angle ?? ""),
              direction: "up",
            }
          : {
              type: "view",
              cardIndex: index,
              angle: String(records[index]?.card.angle ?? ""),
              direction: arriveDir === "start" ? "down" : arriveDir,
            }
      );

      activeIndex.current = index;
      activeSince.current = now;

      // Prefetch when the last card becomes active.
      setRecords((p) => {
        if (index === p.length - 1) void prefetchNext();
        return p;
      });
    },
    [addDwell, logEvent, records, prefetchNext]
  );

  // The trailing loading section became active (user out-scrolled the prefetch).
  // Close out the previous real card's dwell, but don't log a view for the
  // loader itself — it isn't a card. activeIndex parks at -1 until a real card
  // takes over, so the next real card logs a correct arrival.
  const onLoadingActive = useCallback(() => {
    if (terminal.current) return;
    const prev = activeIndex.current;
    if (prev !== -1 && records[prev]) {
      const dwell = Date.now() - activeSince.current;
      addDwell(prev, dwell);
      logEvent({
        type: "advance",
        cardIndex: prev,
        angle: String(records[prev]?.card.angle ?? ""),
        dwellMs: dwell,
        direction: "down",
      });
    }
    activeIndex.current = -1;
    activeSince.current = Date.now();
  }, [addDwell, logEvent, records]);

  const onScroll = useCallback((index: number, depth: number) => {
    scrollDepth.current[index] = Math.max(scrollDepth.current[index] ?? 0, depth);
  }, []);

  const clickCta = useCallback(() => {
    if (terminal.current) return;
    terminal.current = true;
    const idx = activeIndex.current >= 0 ? activeIndex.current : 0;
    const dwell = Date.now() - activeSince.current;
    addDwell(idx, dwell);
    logEvent({
      type: "cta_click",
      cardIndex: idx,
      angle: String(records[idx]?.card.angle ?? ""),
      dwellMs: dwell,
    });
    setPhase("converted");
  }, [addDwell, logEvent, records]);

  const close = useCallback(() => {
    if (terminal.current) return;
    terminal.current = true;
    const idx = activeIndex.current >= 0 ? activeIndex.current : 0;
    const dwell = Date.now() - activeSince.current;
    addDwell(idx, dwell);
    logEvent({
      type: "leave",
      cardIndex: idx,
      angle: String(records[idx]?.card.angle ?? ""),
      dwellMs: dwell,
    });
    setPhase("ended");
  }, [addDwell, logEvent, records]);

  const restart = useCallback(() => {
    setRecords([]);
    setEvents([]);
    scrollDepth.current = {};
    activeIndex.current = -1;
    activeSince.current = 0;
    terminal.current = false;
    setPhase("intro");
  }, []);

  useEffect(() => {
    const onLeave = () => {
      if (phase !== "feed" || terminal.current) return;
      const idx = activeIndex.current >= 0 ? activeIndex.current : 0;
      const dwell = Date.now() - activeSince.current;
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
    setActiveCard,
    onLoadingActive,
    onScroll,
    clickCta,
    close,
    restart,
    exportJson,
  };
}