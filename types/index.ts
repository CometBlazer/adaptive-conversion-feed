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

// "advance" = user moved past a section downward. Intentionally NOT a rejection:
// dwell time disambiguates "not interested" from "reading on before deciding".
export type ActionType =
  | "view"
  | "advance"
  | "scroll_back"
  | "cta_click"
  | "leave";

export interface ActionEvent {
  type: ActionType;
  cardIndex: number;
  angle: string;
  at: number;        // ms since session start
  dwellMs?: number;
}

export interface CardRecord {
  card: Card;
  shownAt: number;
  dwellMs: number;
  scrollDepth: number;
  visits: number;
  clickedCta: boolean;
  apiKeyUsed: boolean; // true if this card came from the live model, false = fallback
}

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