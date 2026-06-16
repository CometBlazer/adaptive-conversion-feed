// lib/useSession.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT } from "@/lib/product";
import { computeMetrics, expectedReadMs, dwellInterpretation } from "@/lib/metrics";
import {
  reflectOnAction,
  buildSessionProfile,
  type ReflectionInput,
  type SessionProfile,
} from "@/lib/gemini";
import type { ActionEvent, AdaptContext, Card, CardRecord } from "@/types";

type Phase = "intro" | "feed" | "converted" | "ended";

export function useSession() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [records, setRecords] = useState<CardRecord[]>([]);
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [prefetching, setPrefetching] = useState(false);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const sessionStart = useRef<number>(Date.now());
  const scrollDepth = useRef<Record<number, number>>({});
  const activeIndex = useRef<number>(-1);
  const activeSince = useRef<number>(0);
  const generating = useRef(false);
  const terminal = useRef(false);

  const recordsRef = useRef<CardRecord[]>([]);
  const eventsRef = useRef<ActionEvent[]>([]);

  const since = useCallback(() => Date.now() - sessionStart.current, []);

  const updateRecords = useCallback(
    (updater: (prev: CardRecord[]) => CardRecord[]) => {
      const next = updater(recordsRef.current);
      recordsRef.current = next;
      setRecords(next);
    },
    []
  );

  const logEvent = useCallback(
    (e: Omit<ActionEvent, "at">) => {
      const full = { ...e, at: since() };
      eventsRef.current = [...eventsRef.current, full];
      setEvents(eventsRef.current);
    },
    [since]
  );

  const buildContext = useCallback(
    (recs: CardRecord[], evs: ActionEvent[]): AdaptContext => {
      const m = computeMetrics(recs, evs, sessionStart.current, Date.now());
      const outcomeByCard: Record<number, string> = {};
      for (const step of m.timeline) outcomeByCard[step.cardIndex] = step.outcome;

      const seen = recs.filter((r) => r.visits > 0);
      const dwells = seen.map((r) => r.dwellMs);

      return {
        product: { name: PRODUCT.name, tagline: PRODUCT.tagline, cta: PRODUCT.cta },
        history: recs
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => r.visits > 0)
          .map(({ r, i }) => {
            const expected = expectedReadMs(r.card.headline, r.card.subheadline, r.card.body);
            const ratio = expected > 0 ? r.dwellMs / expected : 0;
            return {
              angle: String(r.card.angle),
              headline: r.card.headline,
              body: r.card.body,
              dwellMs: Math.round(r.dwellMs),
              expectedReadMs: expected,
              dwellRatio: Number(ratio.toFixed(2)),
              dwellRead: dwellInterpretation(ratio),
              scrollDepth: r.scrollDepth,
              revisited: r.visits > 1,
              visits: r.visits,
              outcome: outcomeByCard[i] ?? "still_viewing",
              priorAnalysis: r.card.analysis,
              priorReasoning: r.card.reasoning_summary,
              postReflection: r.card.post_action_reflection,
            };
          }),
        anglesUsed: recs.map((r) => String(r.card.angle)),
        stats: {
          cardsSeen: seen.length,
          avgDwellMs: dwells.length ? dwells.reduce((a, b) => a + b, 0) / dwells.length : 0,
          shortestDwellMs: dwells.length ? Math.min(...dwells) : null,
          longestDwellMs: dwells.length ? Math.max(...dwells) : null,
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

  const appendCard = useCallback(
    (card: Card) => {
      updateRecords((prev) => [
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
    },
    [updateRecords]
  );

  const prefetchNext = useCallback(async () => {
    if (generating.current || terminal.current) return;
    generating.current = true;
    setPrefetching(true);
    const card = await fetchCard(buildContext(recordsRef.current, eventsRef.current));
    appendCard(card);
    generating.current = false;
    setPrefetching(false);
  }, [buildContext, fetchCard, appendCard]);

  const begin = useCallback(async () => {
    terminal.current = false;
    activeIndex.current = -1;
    activeSince.current = 0;
    recordsRef.current = [];
    eventsRef.current = [];
    setRecords([]);
    setEvents([]);
    setProfile(null);
    setProfileLoading(false);
    setPhase("feed");
    sessionStart.current = Date.now();
    generating.current = true;
    setPrefetching(true);
    const card = await fetchCard(buildContext([], []));
    appendCard(card);
    generating.current = false;
    setPrefetching(false);
  }, [buildContext, fetchCard, appendCard]);

  const addDwell = useCallback(
    (index: number, dwell: number) => {
      if (dwell <= 0) return;
      const depth = scrollDepth.current[index] ?? 0;
      updateRecords((prev) => {
        if (!prev[index]) return prev;
        const next = [...prev];
        next[index] = {
          ...next[index],
          dwellMs: next[index].dwellMs + dwell,
          scrollDepth: Math.max(next[index].scrollDepth, depth),
        };
        return next;
      });
    },
    [updateRecords]
  );

  const reflectOn = useCallback(
    async (index: number, outcome: string) => {
      const rec = recordsRef.current[index];
      if (!rec) return;
      const expected = expectedReadMs(rec.card.headline, rec.card.subheadline, rec.card.body);
      const ratio = expected > 0 ? rec.dwellMs / expected : 0;
      const input: ReflectionInput = {
        angle: String(rec.card.angle),
        headline: rec.card.headline,
        subheadline: rec.card.subheadline,
        body: rec.card.body,
        priorIntent: rec.card.reasoning_summary,
        dwellMs: Math.round(rec.dwellMs),
        expectedReadMs: expected,
        dwellRatio: ratio,
        scrollDepth: rec.scrollDepth,
        outcome,
        visits: rec.visits,
      };
      const reflection = await reflectOnAction(input);
      if (!reflection) return;
      updateRecords((prev) => {
        if (!prev[index]) return prev;
        const next = [...prev];
        next[index] = {
          ...next[index],
          card: { ...next[index].card, post_action_reflection: reflection },
        };
        return next;
      });
    },
    [updateRecords]
  );

  // End-of-session profile. Gated: sets profileLoading true, resolves, sets false.
  const buildProfile = useCallback(
    async (ctaAngle: string | null, converted: boolean) => {
      setProfileLoading(true);
      // Let in-flight per-card reflections land first.
      await new Promise((r) => setTimeout(r, 300));
      const recs = recordsRef.current;
      const evs = eventsRef.current;
      const m = computeMetrics(recs, evs, sessionStart.current, Date.now());
      const firstVisitSteps = m.timeline.filter((s) => s.visitOrder === 1);
      const cards = firstVisitSteps.map((s) => {
        const rec = recs[s.cardIndex];
        const expected = expectedReadMs(rec.card.headline, rec.card.subheadline, rec.card.body);
        const ratio = expected > 0 ? rec.dwellMs / expected : 0;
        return {
          angle: s.angle,
          headline: s.headline,
          dwellMs: Math.round(rec.dwellMs),
          expectedReadMs: expected,
          dwellRatio: ratio,
          outcome: s.outcome,
          visits: rec.visits,
          reflection: rec.card.post_action_reflection,
        };
      });
      const result = await buildSessionProfile({ converted, ctaAngle, cards });
      setProfile(result);
      setProfileLoading(false);
    },
    []
  );

  const setActiveCard = useCallback(
    (index: number) => {
      if (terminal.current) return;
      const prev = activeIndex.current;
      if (prev === index) return;

      const now = Date.now();

      if (prev !== -1) {
        const dwell = now - activeSince.current;
        addDwell(prev, dwell);
        const exitDir: "up" | "down" = index > prev ? "down" : "up";
        if (exitDir === "down") {
          logEvent({
            type: "advance",
            cardIndex: prev,
            angle: String(recordsRef.current[prev]?.card.angle ?? ""),
            dwellMs: dwell,
            direction: "down",
          });
        }
        const outcome = exitDir === "down" ? "advanced" : "scrolled_back_away";
        void reflectOn(prev, outcome);
      }

      const arriveDir: "up" | "down" | "start" =
        prev === -1 ? "start" : index > prev ? "down" : "up";

      let isRevisit = false;
      updateRecords((p) => {
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
              angle: String(recordsRef.current[index]?.card.angle ?? ""),
              direction: "up",
            }
          : {
              type: "view",
              cardIndex: index,
              angle: String(recordsRef.current[index]?.card.angle ?? ""),
              direction: arriveDir === "start" ? "down" : arriveDir,
            }
      );

      activeIndex.current = index;
      activeSince.current = now;

      if (index === recordsRef.current.length - 1) void prefetchNext();
    },
    [addDwell, logEvent, updateRecords, prefetchNext, reflectOn]
  );

  const onLoadingActive = useCallback(() => {
    if (terminal.current) return;
    const prev = activeIndex.current;
    if (prev !== -1 && recordsRef.current[prev]) {
      const dwell = Date.now() - activeSince.current;
      addDwell(prev, dwell);
      logEvent({
        type: "advance",
        cardIndex: prev,
        angle: String(recordsRef.current[prev]?.card.angle ?? ""),
        dwellMs: dwell,
        direction: "down",
      });
      void reflectOn(prev, "advanced");
    }
    activeIndex.current = -1;
    activeSince.current = Date.now();
  }, [addDwell, logEvent, reflectOn]);

  const onScroll = useCallback((index: number, depth: number) => {
    scrollDepth.current[index] = Math.max(scrollDepth.current[index] ?? 0, depth);
  }, []);

  const clickCta = useCallback(() => {
    if (terminal.current) return;
    terminal.current = true;
    const idx = activeIndex.current >= 0 ? activeIndex.current : 0;
    const dwell = Date.now() - activeSince.current;
    addDwell(idx, dwell);
    const angle = String(recordsRef.current[idx]?.card.angle ?? "");
    logEvent({ type: "cta_click", cardIndex: idx, angle, dwellMs: dwell });
    void reflectOn(idx, "signed_up");
    void buildProfile(angle, true);
    setPhase("converted");
  }, [addDwell, logEvent, reflectOn, buildProfile]);

  const close = useCallback(() => {
    if (terminal.current) return;
    terminal.current = true;
    const idx = activeIndex.current >= 0 ? activeIndex.current : 0;
    const dwell = Date.now() - activeSince.current;
    addDwell(idx, dwell);
    logEvent({
      type: "leave",
      cardIndex: idx,
      angle: String(recordsRef.current[idx]?.card.angle ?? ""),
      dwellMs: dwell,
    });
    void reflectOn(idx, "closed");
    void buildProfile(null, false);
    setPhase("ended");
  }, [addDwell, logEvent, reflectOn, buildProfile]);

  const restart = useCallback(() => {
    recordsRef.current = [];
    eventsRef.current = [];
    setRecords([]);
    setEvents([]);
    setProfile(null);
    setProfileLoading(false);
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
      const full: ActionEvent = {
        type: "leave",
        cardIndex: idx,
        angle: String(recordsRef.current[idx]?.card.angle ?? ""),
        at: Date.now() - sessionStart.current,
        dwellMs: dwell,
      };
      eventsRef.current = [...eventsRef.current, full];
      setEvents(eventsRef.current);
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase]);

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
      reflection_summary: profile,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acf-session-${sessionStart.current}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records, events, metrics, profile]);

  return {
    phase,
    records,
    prefetching,
    metrics,
    profile,
    profileLoading,
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