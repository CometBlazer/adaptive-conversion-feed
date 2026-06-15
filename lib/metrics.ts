// lib/metrics.ts
import type { ActionEvent, CardRecord } from "@/types";

// Dwell threshold (ms) separating a "quick advance" (bounced off) from an
// "engaged advance" (read, then moved on to gather more before deciding).
export const ENGAGED_DWELL_MS = 4000;

export interface SessionMetrics {
  // Primary
  cardsViewedBeforeCta: number | null; // null if no CTA click
  // Conversion
  ctaConverted: boolean;
  sessionLengthMs: number;
  cardsViewed: number;
  dropOffCardIndex: number | null; // last section visible before "leave"
  // Angle effectiveness
  anglesUsed: string[];
  ctaAngle: string | null;
  // Timing
  avgTimePerCardMs: number;
  medianTimePerCardMs: number;
  shortestDwellBeforeAdvanceMs: number | null;
  longestDwellMs: number | null;
  totalDwellMs: number;
  avgScrollDepth: number;
  // Advance behavior (NOT framed as rejection)
  advanceCount: number;          // total sections advanced past
  quickAdvanceCount: number;     // advanced with dwell < threshold (bounced off)
  engagedAdvanceCount: number;   // advanced with dwell >= threshold (read on)
  // Scroll-up behavior
  scrollBackCount: number;
  revisitedCardCount: number;    // distinct sections viewed more than once
  // Per-angle dwell summary
  dwellByAngle: Record<string, { count: number; avgDwellMs: number; avgScroll: number }>;
  actionSequence: { type: string; cardIndex: number; angle: string; at: number }[];
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
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
    actionSequence: events.map((e) => ({
      type: e.type,
      cardIndex: e.cardIndex,
      angle: e.angle,
      at: e.at,
    })),
  };
}