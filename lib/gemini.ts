// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AdaptContext, Card } from "@/types";
import { ANGLES } from "@/types";

const SYSTEM = `You generate ONE persuasive landing-page section for a fictional product, as part of an adaptive-persuasion experiment. The visitor scrolls a feed; each section tries a different tactic. The visitor has been told the page adapts to their behavior.

Your job each turn is to do real analysis, then produce a section that is genuinely DIFFERENT from what came before — different angle, different structure, different length, different rhythm.

ANALYZE FIRST (this drives everything):
- Look at dwell time and scroll depth per previous card. Short dwell + low scroll = that framing bounced off. Long dwell = it held attention but didn't convert. A revisit = something pulled them back.
- Infer what KIND of buyer this behavior suggests and what they have NOT responded to yet.
- Then deliberately pick a different lever.

HARD RULES:
- You MUST use one of the ALLOWED ANGLES provided in the user message. Do not reuse an angle already used. This is non-negotiable.
- VARY THE FORM every time. Rotate deliberately between: a punchy 1-2 sentence body; a longer narrative paragraph; a problem→solution structure; a single provocative question; a concrete scenario; a crisp factual claim. Never reuse the previous card's sentence structure or length.
- Vary headline length too: sometimes 3 words, sometimes 10. Don't always start with a verb.
- Stay truthful about a fictional product. No fabricated statistics, named customers, or fake scarcity. No exploiting fear or insecurity.
- Be concrete and specific to FocusFlow, not generic SaaS filler. Avoid the words "chaos", "chaotic", "messy", "transform", "roadmap" if a prior card already used them — find fresh language.

OUTPUT: Return ONLY a JSON object, no markdown, with exactly these keys:
{"analysis": string, "angle": string, "headline": string, "subheadline": string, "body": string, "inferred_user_state": string, "reasoning_summary": string}

"analysis": 2-3 sentences reasoning about the behavioral signals and what to try next. Think here before you write the card.
"inferred_user_state": one sentence on what the behavior suggests about the visitor.
"reasoning_summary": one sentence on why this angle and form, given the analysis.`;

function buildUserPrompt(ctx: AdaptContext, allowedAngles: string[]): string {
  const priorForms = ctx.history.length
    ? ctx.history
        .map(
          (h, i) =>
            `${i + 1}. angle=${h.angle} | dwell=${Math.round(h.dwellMs)}ms | scroll=${h.scrollDepth.toFixed(
              2
            )}${h.revisited ? " | REVISITED" : ""} | headline: "${h.headline}"`
        )
        .join("\n")
    : "(this is the first card — open strong, no history yet)";

  return `Product: ${ctx.product.name} — ${ctx.product.tagline}
CTA label: ${ctx.product.cta}

ALLOWED ANGLES (you MUST choose exactly one, none repeated): ${allowedAngles.join(", ")}

Session stats: ${JSON.stringify(ctx.stats)}

Previous cards (oldest first):
${priorForms}

Recall the form/length/structure of the previous cards above and make THIS one clearly different. Analyze the behavioral signals, then return the JSON object only.`;
}

function isValidCard(obj: unknown): obj is Card & { analysis?: string } {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.headline === "string" &&
    typeof o.subheadline === "string" &&
    typeof o.body === "string" &&
    typeof o.angle === "string" &&
    typeof o.inferred_user_state === "string" &&
    typeof o.reasoning_summary === "string"
  );
}

// Deterministic, VARIED fallbacks so no-key testing doesn't look monotonous.
const FALLBACKS: Record<string, Omit<Card, "inferred_user_state" | "reasoning_summary">> = {
  social_proof: {
    angle: "social_proof",
    headline: "Founders ship faster with FocusFlow",
    subheadline: "Join the teams who stopped wrestling their notes.",
    body: "Thousands of early-stage builders use FocusFlow to turn raw thinking into a plan their whole team can run with.",
  },
  curiosity: {
    angle: "curiosity",
    headline: "What if your notes wrote the plan?",
    subheadline: "There's a faster path from idea to launch.",
    body: "Most planning tools make you do the structuring. FocusFlow flips that. Curious how?",
  },
  cost_savings: {
    angle: "cost_savings",
    headline: "Reclaim ten hours a week",
    subheadline: "Planning shouldn't cost you your build time.",
    body: "Every hour spent reformatting notes is an hour not building. FocusFlow gives that time back.",
  },
  evidence: {
    angle: "evidence",
    headline: "From brain-dump to milestones, measurably faster",
    subheadline: "Built for how founders actually think.",
    body: "FocusFlow reads unstructured notes and outputs structured timelines — the same task that takes a person an afternoon.",
  },
  identity: {
    angle: "identity",
    headline: "For builders, not bureaucrats",
    subheadline: "You're here to ship, not to file.",
    body: "FocusFlow is for the founder who'd rather be writing code or talking to users than maintaining a planning doc.",
  },
  aspiration: {
    angle: "aspiration",
    headline: "Launch the thing you keep almost starting",
    subheadline: "The gap between idea and execution, closed.",
    body: "Picture your scattered notes already becoming next week's launch plan. That's the default with FocusFlow.",
  },
  convenience: {
    angle: "convenience",
    headline: "Paste notes. Get a plan.",
    subheadline: "No setup, no templates.",
    body: "Drop in whatever you've got and FocusFlow hands back a launch-ready plan.",
  },
  fomo: {
    angle: "fomo",
    headline: "Your competitors already shipped this week",
    subheadline: "Speed compounds.",
    body: "While planning eats your week, faster teams are already iterating. FocusFlow keeps you in the race.",
  },
  objection_handling: {
    angle: "objection_handling",
    headline: "Worried it won't get your messy notes?",
    subheadline: "That's exactly what it's built for.",
    body: "Half-formed bullet points, voice memos, contradictory ideas — FocusFlow is designed for real, imperfect input.",
  },
  testimonial: {
    angle: "testimonial",
    headline: "\"It planned my launch before my coffee got cold\"",
    subheadline: "— an early FocusFlow user (illustrative)",
    body: "Founders describe the same moment: pasting a mess of notes and watching a usable plan appear.",
  },
};

function pickAllowedAngles(ctx: AdaptContext): string[] {
  const used = new Set(ctx.anglesUsed.map(String));
  const remaining = ANGLES.filter((a) => !used.has(a));
  // If everything's been used, allow all again (a long session).
  return remaining.length ? remaining : [...ANGLES];
}

function fallbackCard(allowed: string[]): Card {
  const angle = allowed[Math.floor(Math.random() * allowed.length)] ?? "curiosity";
  const base = FALLBACKS[angle] ?? FALLBACKS.curiosity;
  return {
    ...base,
    inferred_user_state: "Unknown — generation fell back to built-in content.",
    reasoning_summary: `Served a varied fallback for the ${angle} angle (no live model).`,
  };
}

export async function generateCard(
  ctx: AdaptContext
): Promise<{ card: Card; usedFallback: boolean }> {
  const allowed = pickAllowedAngles(ctx);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { card: fallbackCard(allowed), usedFallback: true };

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-lite-latest",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 1.15,
        topP: 0.95,
      },
      systemInstruction: SYSTEM,
    });

    // Up to 2 attempts: retry if the model repeats a used angle.
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await model.generateContent(buildUserPrompt(ctx, allowed));
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        continue;
      }
      if (!isValidCard(parsed)) continue;

      const card = parsed as Card;
      // Enforce the angle constraint in code, not just in the prompt.
      if (!allowed.includes(String(card.angle))) {
        if (attempt === 0) continue; // retry once
        card.angle = allowed[0]; // last resort: snap to an allowed angle
      }
      // Strip the analysis field from what we store (keep card clean), but it
      // already did its job by being generated before the rest.
      return { card, usedFallback: false };
    }

    return { card: fallbackCard(allowed), usedFallback: true };
  } catch {
    return { card: fallbackCard(allowed), usedFallback: true };
  }
}