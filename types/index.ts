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
  // pre_load reasoning (written before the card is shown):
  inferred_user_state: string;
  reasoning_summary: string;
  analysis?: string;
  avoided?: string;
  // post_action reflection (written after the user reacts to this card):
  post_action_reflection?: string;
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
    body: string;
    dwellMs: number;
    expectedReadMs: number;   // how long one read SHOULD take
    dwellRatio: number;       // actual / expected
    dwellRead: string;        // plain-language interpretation
    scrollDepth: number;
    revisited: boolean;
    visits: number;
    outcome: string;          // what the user did after this card
    // the model's own prior intent, fed back for reflection:
    priorAnalysis?: string;
    priorReasoning?: string;
    postReflection?: string;
  }[];
  anglesUsed: string[];
  stats: {
    cardsSeen: number;
    avgDwellMs: number;
    shortestDwellMs: number | null;
    longestDwellMs: number | null;
  };
}