// types/index.ts
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

// User actions that can be logged.
// "advance" = the user moved past a section downward. This is intentionally
// NOT framed as a rejection: advancing can mean "not interested" OR "interested,
// reading on before deciding". Dwell time disambiguates the two.
export type ActionType =
  | "view"         // a section entered the viewport (first time)
  | "advance"      // a section left the viewport downward
  | "scroll_back"  // user scrolled up to a previous section
  | "cta_click"
  | "leave";       // user closed the experiment (X) or the tab

export interface ActionEvent {
  type: ActionType;
  cardIndex: number;
  angle: string;
  at: number;        // ms since session start
  dwellMs?: number;  // visible time accrued for this section at the moment of the event
}

// One section together with everything we observed about it.
export interface CardRecord {
  card: Card;
  shownAt: number;     // ms since session start (first time it became visible)
  dwellMs: number;     // accumulated visible time across all visits
  scrollDepth: number; // 0..1 max fraction of body scrolled
  visits: number;      // how many times it entered the viewport (>1 = revisited)
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
    revisited: boolean;
  }[];
  anglesUsed: string[];
  stats: {
    cardsSeen: number;
    avgDwellMs: number;
    shortestDwellMs: number | null;
    longestDwellMs: number | null;
  };
}