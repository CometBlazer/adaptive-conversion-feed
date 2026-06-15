// lib/metrics.ts
import type { ActionEvent, CardRecord } from "@/types";

// Dwell threshold (ms) separating a "quick advance" (bounced off) from an
// "engaged advance" (read, then moved on to gather more before deciding).
export const ENGAGED_DWELL_MS = 4000;

// How a given step (a single time a card was on screen) ended.
export type StepOutcome =
  | "advanced"           // scrolled down to the next section
  | "scrolled_back_away" // scrolled up, away from this section
  | "signed_up"          // clicked the CTA
  | "closed"             // hit the X / closed the tab
  | "still_viewing";     // session captured while this was on screen

export interface TimelineStep {
  step: number;          // 1-based order of this step in the session
  cardIndex: number;     // which card (0-based); repeats if revisited
  visitOrder: number;    // 1 = first time seen, 2 = second, ...
  angle: string;
  headline: string;
  subheadline: string;
  body: string;
  dwellMs: number;       // time on screen for THIS visit
  apiKeyUsed: boolean;   // did this card come from the model or the fallback?
  outcome: StepOutcome;
}

export interface SessionMetrics {
  // Primary
  cardsViewedBeforeCta: number | null;
  // Conversion
  ctaConverted: boolean;
  sessionLengthMs: number;
  cardsViewed: number;
  dropOffCardIndex: number | null;
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
  advanceCount: number;
  quickAdvanceCount: number;
  engagedAdvanceCount: number;
  // Scroll-up behavior
  scrollBackCount: number;
  revisitedCardCount: number;
  // Per-angle dwell summary
  dwellByAngle: Record<string, { count: number; avgDwellMs: number; avgScroll: number }>;
  // API usage
  apiKeyUsedAnywhere: boolean;   // did any card come from the live model?
  allCardsFromModel: boolean;    // did every card come from the live model?
  fallbackCardCount: number;     // how many cards were fallback content
  // Step-by-step record
  timeline: TimelineStep[];
  // Raw action stream (kept for completeness)
  actionSequence: { type: string; cardIndex: number; angle: string; at: number }[];
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Fold the event stream into one block per card-visit, tagged with its outcome.
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

    let outcome: StepOutcome = "still_viewing";
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
        dwellMs = n.dwellMs ?? 0;
        found = true;
        break;
      }
      if ((n.type === "view" || n.type === "scroll_back") && n.cardIndex !== e.cardIndex) {
        outcome = "scrolled_back_away";
        dwellMs = Math.max(0, n.at - e.at);
        found = true;
        break;
      }
    }

    // No closing event: this step is still open (the active card at capture time).
    // Always show real time spent: prefer the record's accumulated dwell, and if
    // that's somehow zero, fall back to elapsed-since-shown so it's never 0.
    if (!found) {
      dwellMs = rec.dwellMs > 0 ? rec.dwellMs : Math.max(0, (events[events.length - 1]?.at ?? e.at) - e.at);
    }
    // Guard: if a closing event reported 0 but the record has real dwell, use it.
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
      apiKeyUsed: rec.apiKeyUsed,
      outcome,
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

  const fallbackCardCount = records.filter((r) => !r.apiKeyUsed).length;

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
    apiKeyUsedAnywhere: records.some((r) => r.apiKeyUsed),
    allCardsFromModel: records.length > 0 && records.every((r) => r.apiKeyUsed),
    fallbackCardCount,
    timeline: buildTimeline(records, events),
    actionSequence: events.map((e) => ({
      type: e.type,
      cardIndex: e.cardIndex,
      angle: e.angle,
      at: e.at,
    })),
  };
}