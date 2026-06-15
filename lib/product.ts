import type { Angle } from "@/types";

export const PRODUCT = {
  name: "FocusFlow",
  tagline: "An AI workspace that turns messy founder notes into launch-ready plans.",
  cta: "Start FocusFlow",
} as const;

// Human-readable labels for the research dashboard.
export const ANGLE_LABEL: Record<Angle, string> = {
  social_proof: "Social proof",
  convenience: "Convenience",
  curiosity: "Curiosity",
  identity: "Identity",
  aspiration: "Aspiration",
  cost_savings: "Cost savings",
  fomo: "Fear of missing out",
  objection_handling: "Objection handling",
  evidence: "Evidence",
  testimonial: "Testimonial",
};

// Short hue per angle for the dashboard chips. Kept muted on purpose.
export const ANGLE_HUE: Record<Angle, string> = {
  social_proof: "#4C6B4F",
  convenience: "#3A5BE0",
  curiosity: "#8A5BD9",
  identity: "#B5762A",
  aspiration: "#2A8FB5",
  cost_savings: "#4C6B4F",
  fomo: "#D9531E",
  objection_handling: "#6B6358",
  evidence: "#3A5BE0",
  testimonial: "#B5762A",
};
