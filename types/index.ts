// All persuasion angles the system can draw from.
export const ANGLES = [
  "social_proof",
  "convenience",
  "curiosity",
  "identity",
  "aspiration",
  "cost_savings",
  "fomo",
  "objection_handling",
  "evidence",
  "testimonial",
] as const;

export type Angle = (typeof ANGLES)[number];

// A single generated persuasive card, as returned by the model.
export interface Card {
  headline: string;
  subheadline: string;
  body: string;
  angle: Angle | string;
  inferred_user_state: string;
  reasoning_summary: string;
}

// User actions that can be logged against a card.
export type ActionType = "view" | "request_another" | "cta_click" | "leave";

export interface ActionEvent {
  type: ActionType;
  cardIndex: number;
  angle: string;
  // ms since session start
  at: number;
  // ms the card was on screen before this action (for dwell/time-per-card)
  dwellMs?: number;
}

// One card together with everything we observed about it.
export interface CardRecord {
  card: Card;
  shownAt: number; // ms since session start
  dwellMs: number; // accumulated visible time
  scrollDepth: number; // 0..1 max fraction of body scrolled
  requestedAnother: boolean;
  clickedCta: boolean;
}

// What we send to the model so it can adapt.
export interface AdaptContext {
  product: { name: string; tagline: string; cta: string };
  history: {
    angle: string;
    headline: string;
    dwellMs: number;
    scrollDepth: number;
    requestedAnother: boolean;
  }[];
  anglesUsed: string[];
  stats: {
    cardsSeen: number;
    avgDwellMs: number;
    fastestRejectMs: number | null;
    slowestDwellMs: number | null;
  };
}
