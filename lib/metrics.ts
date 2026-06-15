import type { ActionEvent, CardRecord } from "@/types";

export interface SessionMetrics {
  // Primary
  cardsViewedBeforeCta: number | null; // null if no CTA click
  // Secondary
  ctaConverted: boolean;
  sessionLengthMs: number;
  cardsViewed: number;
  dropOffCardIndex: number | null; // index of last card before a "leave"
  // Angle effectiveness
  anglesUsed: string[];
  ctaAngle: string | null; // angle of the card that converted
  // Future / derived
  avgTimePerCardMs: number;
  medianTimePerCardMs: number;
  fastestRejectMs: number | null; // shortest dwell before request_another
  slowestDwellMs: number | null;
  totalDwellMs: number;
  avgScrollDepth: number;
  requestAnotherCount: number;
  // Per-angle dwell summary, for effectiveness comparison
  dwellByAngle: Record<string, { count: number; avgDwellMs: number; avgScroll: number }>;
  // Sequence of actions for replay
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

  const rejectDwells = events
    .filter((e) => e.type === "request_another" && typeof e.dwellMs === "number")
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
    fastestRejectMs: rejectDwells.length ? Math.min(...rejectDwells) : null,
    slowestDwellMs: dwellTimes.length ? Math.max(...dwellTimes) : null,
    totalDwellMs: dwellTimes.reduce((a, b) => a + b, 0),
    avgScrollDepth: records.length
      ? records.reduce((a, r) => a + r.scrollDepth, 0) / records.length
      : 0,
    requestAnotherCount: events.filter((e) => e.type === "request_another").length,
    dwellByAngle,
    actionSequence: events.map((e) => ({
      type: e.type,
      cardIndex: e.cardIndex,
      angle: e.angle,
      at: e.at,
    })),
  };
}
