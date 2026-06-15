// lib/metrics.ts
import type { ActionEvent, CardRecord } from "@/types";

export const ENGAGED_DWELL_MS = 4000;

export type StepOutcome =
  | "advanced"
  | "scrolled_back_away"
  | "signed_up"
  | "closed"
  | "still_viewing";

export interface TimelineStep {
  step: number;
  cardIndex: number;
  visitOrder: number;
  angle: string;
  headline: string;
  subheadline: string;
  body: string;
  dwellMs: number;
  arrivedBy: "down" | "up" | "start"; // how the user got TO this card
  outcome: StepOutcome;
  leftBy: "down" | "up" | null;       // direction they left, if they left
}

export interface SessionMetrics {
  cardsViewedBeforeCta: number | null;
  ctaConverted: boolean;
  sessionLengthMs: number;
  cardsViewed: number;
  dropOffCardIndex: number | null;
  anglesUsed: string[];
  ctaAngle: string | null;
  avgTimePerCardMs: number;
  medianTimePerCardMs: number;
  shortestDwellBeforeAdvanceMs: number | null;
  longestDwellMs: number | null;
  totalDwellMs: number;
  avgScrollDepth: number;
  advanceCount: number;
  quickAdvanceCount: number;
  engagedAdvanceCount: number;
  scrollBackCount: number;
  revisitedCardCount: number;
  dwellByAngle: Record<string, { count: number; avgDwellMs: number; avgScroll: number }>;
  timeline: TimelineStep[];
  actionSequence: {
    type: string;
    cardIndex: number;
    angle: string;
    at: number;
    direction?: "up" | "down";
  }[];
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function buildTimeline(records: CardRecord[], events: ActionEvent[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const visitCounts: Record<number, number> = {};
  let stepNo = 0;

  events.forEach((e, i) => {
    if (e.type !== "view" && e.type !== "scroll_back") return;
    const rec = records[e.cardIndex];
    if (!rec) return;

    stepNo += 1;
    visitCounts[e.cardIndex] = (visitCounts[e.cardIndex] ?? 0) + 1;

    const arrivedBy: "down" | "up" | "start" =
      stepNo === 1 ? "start" : e.direction === "up" ? "up" : "down";

    let outcome: StepOutcome = "still_viewing";
    let leftBy: "down" | "up" | null = null;
    let dwellMs = 0;
    let found = false;

    for (let j = i + 1; j < events.length; j++) {
      const n = events[j];
      if (n.type === "cta_click" && n.cardIndex === e.cardIndex) {
        outcome = "signed_up";
        dwellMs = n.dwellMs ?? 0;
        found = true;
        break;
      }
      if (n.type === "leave" && n.cardIndex === e.cardIndex) {
        outcome = "closed";
        dwellMs = n.dwellMs ?? 0;
        found = true;
        break;
      }
      if (n.type === "advance" && n.cardIndex === e.cardIndex) {
        outcome = "advanced";
        leftBy = "down";
        dwellMs = n.dwellMs ?? 0;
        found = true;
        break;
      }
      if ((n.type === "view" || n.type === "scroll_back") && n.cardIndex !== e.cardIndex) {
        outcome = "scrolled_back_away";
        leftBy = n.cardIndex < e.cardIndex ? "up" : "down";
        dwellMs = Math.max(0, n.at - e.at);
        found = true;
        break;
      }
    }

    if (!found) {
      dwellMs =
        rec.dwellMs > 0
          ? rec.dwellMs
          : Math.max(0, (events[events.length - 1]?.at ?? e.at) - e.at);
    }
    if (found && dwellMs === 0 && rec.dwellMs > 0) {
      dwellMs = rec.dwellMs;
    }

    steps.push({
      step: stepNo,
      cardIndex: e.cardIndex,
      visitOrder: visitCounts[e.cardIndex],
      angle: String(rec.card.angle),
      headline: rec.card.headline,
      subheadline: rec.card.subheadline,
      body: rec.card.body,
      dwellMs,
      arrivedBy,
      outcome,
      leftBy,
    });
  });

  return steps;
}

export function computeMetrics(
  records: CardRecord[],
  events: ActionEvent[],
  sessionStart: number,
  now: number
): SessionMetrics {
  const dwellTimes = records.map((r) => r.dwellMs);
  const ctaEvent = events.find((e) => e.type === "cta_click");
  const leaveEvent = events.find((e) => e.type === "leave");

  const advanceDwells = events
    .filter((e) => e.type === "advance" && typeof e.dwellMs === "number")
    .map((e) => e.dwellMs as number);

  const dwellByAngle: SessionMetrics["dwellByAngle"] = {};
  for (const r of records) {
    const key = String(r.card.angle);
    if (!dwellByAngle[key]) dwellByAngle[key] = { count: 0, avgDwellMs: 0, avgScroll: 0 };
    const agg = dwellByAngle[key];
    agg.avgDwellMs = (agg.avgDwellMs * agg.count + r.dwellMs) / (agg.count + 1);
    agg.avgScroll = (agg.avgScroll * agg.count + r.scrollDepth) / (agg.count + 1);
    agg.count += 1;
  }

  return {
    cardsViewedBeforeCta: ctaEvent ? ctaEvent.cardIndex + 1 : null,
    ctaConverted: Boolean(ctaEvent),
    sessionLengthMs: now - sessionStart,
    cardsViewed: records.length,
    dropOffCardIndex: leaveEvent ? leaveEvent.cardIndex : null,
    anglesUsed: records.map((r) => String(r.card.angle)),
    ctaAngle: ctaEvent ? ctaEvent.angle : null,
    avgTimePerCardMs: dwellTimes.length
      ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
      : 0,
    medianTimePerCardMs: median(dwellTimes),
    shortestDwellBeforeAdvanceMs: advanceDwells.length ? Math.min(...advanceDwells) : null,
    longestDwellMs: dwellTimes.length ? Math.max(...dwellTimes) : null,
    totalDwellMs: dwellTimes.reduce((a, b) => a + b, 0),
    avgScrollDepth: records.length
      ? records.reduce((a, r) => a + r.scrollDepth, 0) / records.length
      : 0,
    advanceCount: advanceDwells.length,
    quickAdvanceCount: advanceDwells.filter((d) => d < ENGAGED_DWELL_MS).length,
    engagedAdvanceCount: advanceDwells.filter((d) => d >= ENGAGED_DWELL_MS).length,
    scrollBackCount: events.filter((e) => e.type === "scroll_back").length,
    revisitedCardCount: records.filter((r) => r.visits > 1).length,
    dwellByAngle,
    timeline: buildTimeline(records, events),
    actionSequence: events.map((e) => ({
      type: e.type,
      cardIndex: e.cardIndex,
      angle: e.angle,
      at: e.at,
      direction: e.direction,
    })),
  };
}