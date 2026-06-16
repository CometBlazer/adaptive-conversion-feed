// types/index.ts
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

export interface Card {
  headline: string;
  subheadline: string;
  body: string;
  angle: Angle | string;
  inferred_user_state: string;
  reasoning_summary: string;
  analysis?: string; // model's reasoning from the behavioral record (dev-visible)
  avoided?: string;  // patterns the model deliberately didn't repeat (dev-visible)
}

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
  at: number;
  dwellMs?: number;
  direction?: "up" | "down"; // set on advance (down) and scroll_back (up)
}

export interface CardRecord {
  card: Card;
  shownAt: number;
  dwellMs: number;
  scrollDepth: number;
  visits: number;
  clickedCta: boolean;
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