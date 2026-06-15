import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AdaptContext, Card } from "@/types";
import { ANGLES } from "@/types";

const SYSTEM = `You write a single persuasive card for a fictional product landing-page research prototype.

This is an adaptive-persuasion experiment. The visitor has been told the page adapts to their behavior. Your job is to try a DIFFERENT persuasive angle than the ones already used, informed by how the visitor engaged with previous cards.

Hard rules:
- Stay truthful about the fictional product. Do not invent fake statistics, fake named customers, or fake guarantees presented as real.
- Do NOT exploit emotional vulnerability, fear, insecurity, or pressure. No manipulation, no dark patterns, no fabricated scarcity ("only 2 left!").
- Testimonials and social proof must be clearly illustrative for a fictional product, not passed off as verified real people.
- Be concise. Headline under 12 words. Body under 60 words.
- Pick an angle from this set you have NOT already used: ${ANGLES.join(", ")}.

Return ONLY a JSON object, no markdown, no backticks, with exactly these keys:
{"headline": string, "subheadline": string, "body": string, "angle": string, "inferred_user_state": string, "reasoning_summary": string}

"inferred_user_state": one short sentence on what the behavior suggests about the visitor.
"reasoning_summary": one short sentence on why you chose this angle next.`;

function buildUserPrompt(ctx: AdaptContext): string {
  return `Product: ${ctx.product.name} — ${ctx.product.tagline}
CTA label: ${ctx.product.cta}

Angles already used: ${ctx.anglesUsed.length ? ctx.anglesUsed.join(", ") : "none yet"}

Session stats: ${JSON.stringify(ctx.stats)}

Card history (most recent last):
${
  ctx.history.length
    ? ctx.history
        .map(
          (h, i) =>
            `${i + 1}. angle=${h.angle} | dwell=${Math.round(h.dwellMs)}ms | scroll=${h.scrollDepth.toFixed(
              2
            )} | "${h.headline}"`
        )
        .join("\n")
    : "(this is the first card)"
}

Infer which kinds of arguments are not landing (short dwell, low scroll, immediate "show another") and choose a fresh angle likely to land better. Return the JSON object only.`;
}

function isValidCard(obj: unknown): obj is Card {
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

function fallbackCard(ctx: AdaptContext): Card {
  const unused = ANGLES.find((a) => !ctx.anglesUsed.includes(a)) ?? "curiosity";
  return {
    headline: `${ctx.product.name} keeps your launch moving`,
    subheadline: ctx.product.tagline,
    body: "Drop in your scattered notes and get a structured, launch-ready plan back. No setup, no busywork.",
    angle: unused,
    inferred_user_state: "Unknown — generation fell back to a default card.",
    reasoning_summary: "Model output was unavailable or invalid; served a safe default.",
  };
}

export async function generateCard(ctx: AdaptContext): Promise<{ card: Card; usedFallback: boolean }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { card: fallbackCard(ctx), usedFallback: true };

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
      systemInstruction: SYSTEM,
    });
    const result = await model.generateContent(buildUserPrompt(ctx));
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!isValidCard(parsed)) return { card: fallbackCard(ctx), usedFallback: true };
    return { card: parsed, usedFallback: false };
  } catch {
    return { card: fallbackCard(ctx), usedFallback: true };
  }
}
