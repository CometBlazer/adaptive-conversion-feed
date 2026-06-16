// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AdaptContext, Card } from "@/types";
import { ANGLES } from "@/types";

const SYSTEM = `You generate ONE persuasive landing-page section for a fictional product, as part of an adaptive-persuasion experiment. The visitor scrolls a feed; each section tries a fresh tactic. The visitor has been told the page adapts to their behavior.

Your job each turn: study the FULL behavioral record of the session so far, reason hard about what this specific person is responding to, and produce a section that is genuinely NEW — a different angle, a different shape, and a genuinely creative execution, not a textbook version of the angle.

HOW TO READ THE BEHAVIORAL RECORD:
- dwell = how long they stayed on a card. Long dwell = it held them. Short dwell = it bounced off.
- scrollDepth = how far they read. High depth + short dwell = skimmed and left; low depth = barely looked.
- revisits = they scrolled BACK to a card. That card pulled them back — something there resonated. Mine it.
- "quick advance" = left fast (under 4s); "engaged advance" = read it, then moved on. Engaged advances mean the message was understood but not yet convincing enough — escalate, don't repeat.
- arrived_by / left_by (up/down) tells you their movement pattern. Lots of up-scrolling = comparing, deliberating.

REASON FIRST, THEN WRITE. In your analysis: name what has clearly NOT worked, name what (if anything) pulled attention, infer what kind of person this behavior suggests, and decide on a deliberately UNEXPECTED way in.

BE CONCISE — THIS IS THE MOST IMPORTANT FORMATTING RULE:
- This is a scroll feed, not an essay. People skim. Every section must be readable in under 3 seconds.
- headline: max 8 words. Punchy.
- subheadline: max 12 words. One line.
- body: max 2 short sentences, ~30 words TOTAL. Hard ceiling. Often 1 sentence is better.
- Cut every word that isn't pulling weight. No throat-clearing, no "in today's world", no stacked clauses. Short, declarative, high-impact.

HARD RULES:
- Use exactly one of the ALLOWED ANGLES given in the user message. Never reuse a used angle.
- Be CREATIVE within the angle. Avoid clichés and the obvious execution. Surprise the reader: an unusual opening, a concrete vivid detail, an unexpected framing, a sharp turn of phrase. Do not sound like generic SaaS copy.
- VARY THE FORM hard from the previous cards, but keep ALL of them short: rotate between a punchy one-liner, a single provocative question, a two-sentence problem→twist, a blunt factual claim, a concrete one-line scenario. Never echo the previous card's structure or rhythm. (Length stays short regardless of form.)
- Never reuse a distinctive word or image a previous card already used. Find fresh language.
- Truthful about a fictional product. No fabricated stats, named customers, or fake scarcity. No exploiting fear or insecurity.

OUTPUT: Return ONLY a JSON object, no markdown, with exactly these keys:
{"analysis": string, "avoided": string, "angle": string, "headline": string, "subheadline": string, "body": string, "inferred_user_state": string, "reasoning_summary": string}

"analysis": 2-4 sentences reasoning from the behavioral record before you write.
"avoided": one sentence naming the specific patterns/words/structures from prior cards you are deliberately NOT repeating.
"inferred_user_state": one sentence on what the behavior suggests about this visitor.
"reasoning_summary": one sentence on why this angle + this creative execution, given the record.`;

// A compact, model-readable digest of the session — richer than a thin history
// list, but curated so a small model reasons from signal, not raw noise.
function buildSessionDigest(ctx: AdaptContext): string {
  if (!ctx.history.length) {
    return "(First card. No behavioral data yet — open with something striking that earns the next scroll.)";
  }

  const lines = ctx.history.map((h, i) => {
    const tags: string[] = [];
    if (h.revisited) tags.push("REVISITED (pulled them back)");
    if (h.dwellMs < 2000) tags.push("short dwell (bounced)");
    else if (h.dwellMs > 6000) tags.push("long dwell (held attention)");
    if (h.scrollDepth >= 0.8) tags.push("read fully");
    else if (h.scrollDepth < 0.3) tags.push("barely read");
    return `  Card ${i + 1} [${h.angle}]: dwell ${Math.round(h.dwellMs)}ms, scroll ${h.scrollDepth.toFixed(
      2
    )}${tags.length ? " — " + tags.join("; ") : ""}\n    headline: "${h.headline}"`;
  });

  return lines.join("\n");
}

function buildUserPrompt(ctx: AdaptContext, allowedAngles: string[]): string {
  return `Product: ${ctx.product.name} — ${ctx.product.tagline}
CTA: ${ctx.product.cta}

ALLOWED ANGLES (choose exactly one, none repeated): ${allowedAngles.join(", ")}

Session-wide signal: ${JSON.stringify(ctx.stats)}

BEHAVIORAL RECORD (oldest first — reason from this):
${buildSessionDigest(ctx)}

Study the record above. Name what hasn't worked and what (if anything) resonated, then craft a section with a NEW allowed angle and a creative, unexpected execution that breaks from the patterns above. Keep it SHORT: headline ≤8 words, subheadline ≤12 words, body ≤2 sentences / ~30 words. Return the JSON object only.`;
}

function isValidCard(obj: unknown): boolean {
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

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Normalize a parsed object into a Card, preserving the reasoning fields so the
// dev can inspect them. analysis/avoided are optional in the schema.
function toCard(parsed: Record<string, unknown>): Card {
  return {
    headline: String(parsed.headline ?? ""),
    subheadline: String(parsed.subheadline ?? ""),
    body: String(parsed.body ?? ""),
    angle: String(parsed.angle ?? ""),
    inferred_user_state: String(parsed.inferred_user_state ?? ""),
    reasoning_summary: String(parsed.reasoning_summary ?? ""),
    analysis: typeof parsed.analysis === "string" ? parsed.analysis : undefined,
    avoided: typeof parsed.avoided === "string" ? parsed.avoided : undefined,
  };
}

// Varied fallbacks (one per angle) so no-key testing looks like a real session.
const FALLBACKS: Record<string, Pick<Card, "angle" | "headline" | "subheadline" | "body">> = {
  social_proof: {
    angle: "social_proof",
    headline: "Founders ship faster with FocusFlow",
    subheadline: "The teams who stopped wrestling their notes.",
    body: "Early-stage builders turn raw thinking into a plan the whole team can run with.",
  },
  curiosity: {
    angle: "curiosity",
    headline: "What if your notes wrote the plan?",
    subheadline: "A faster path from idea to launch.",
    body: "Most tools make you do the structuring. FocusFlow flips that.",
  },
  cost_savings: {
    angle: "cost_savings",
    headline: "Reclaim ten hours a week",
    subheadline: "Planning shouldn't cost your build time.",
    body: "Every hour reformatting notes is an hour not building. Take it back.",
  },
  evidence: {
    angle: "evidence",
    headline: "Brain-dump to milestones, faster",
    subheadline: "Built for how founders actually think.",
    body: "FocusFlow turns unstructured notes into structured timelines in seconds.",
  },
  identity: {
    angle: "identity",
    headline: "For builders, not bureaucrats",
    subheadline: "You're here to ship, not to file.",
    body: "For the founder who'd rather build than babysit a planning doc.",
  },
  aspiration: {
    angle: "aspiration",
    headline: "Launch the thing you keep almost starting",
    subheadline: "Idea to execution, closed.",
    body: "Your scattered notes, already next week's launch plan.",
  },
  convenience: {
    angle: "convenience",
    headline: "Paste notes. Get a plan.",
    subheadline: "No setup, no templates.",
    body: "Drop in whatever you've got. Get back a launch-ready plan.",
  },
  fomo: {
    angle: "fomo",
    headline: "Faster teams already shipped this week",
    subheadline: "Speed compounds.",
    body: "While planning eats your week, faster teams are iterating.",
  },
  objection_handling: {
    angle: "objection_handling",
    headline: "Think it can't handle your mess?",
    subheadline: "That's exactly what it's for.",
    body: "Half-formed bullets, voice memos, contradictions — all fair input.",
  },
  testimonial: {
    angle: "testimonial",
    headline: "\"Planned my launch before my coffee cooled\"",
    subheadline: "— an early user (illustrative)",
    body: "Paste a mess of notes, watch a usable plan appear.",
  },
};

function pickAllowedAngles(ctx: AdaptContext): string[] {
  const used = new Set(ctx.anglesUsed.map(String));
  const remaining = ANGLES.filter((a) => !used.has(a));
  return remaining.length ? remaining : [...ANGLES];
}

function fallbackCard(allowed: string[]): Card {
  const angle = allowed[Math.floor(Math.random() * allowed.length)] ?? "curiosity";
  const base = FALLBACKS[angle] ?? FALLBACKS.curiosity;
  return {
    ...base,
    inferred_user_state: "Unknown — generation fell back to built-in content.",
    reasoning_summary: `Served a varied fallback for the ${angle} angle (no live model).`,
    analysis: "No live model — fallback content served.",
    avoided: "N/A (fallback).",
  };
}

const MAX_BODY_WORDS = 45; // soft ceiling; triggers one retry if exceeded

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
        temperature: 1.2,
        topP: 0.97,
      },
      systemInstruction: SYSTEM,
    });

    let lastValid: Card | null = null;

    // Up to 3 attempts: retry on bad JSON, repeated angle, or over-length body.
    for (let attempt = 0; attempt < 3; attempt++) {
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

      const card = toCard(parsed as Record<string, unknown>);

      // Enforce the angle constraint in code, not just in the prompt.
      if (!allowed.includes(String(card.angle))) {
        if (attempt < 2) continue;
        card.angle = allowed[0];
      }

      // Keep the most recent valid card as a fallback for the over-length case.
      lastValid = card;

      // Length gate: if the body is too long, retry for a tighter one.
      if (wordCount(card.body) > MAX_BODY_WORDS && attempt < 2) continue;

      return { card, usedFallback: false };
    }

    // If every attempt was over-length but otherwise valid, use the last one.
    if (lastValid) return { card: lastValid, usedFallback: false };

    return { card: fallbackCard(allowed), usedFallback: true };
  } catch {
    return { card: fallbackCard(allowed), usedFallback: true };
  }
}