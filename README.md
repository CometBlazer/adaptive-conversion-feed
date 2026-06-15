# Adaptive Conversion Feed

A research prototype exploring **adaptive persuasion**: can a language model discover
increasingly effective arguments for a specific person using only a sequence of implicit
interaction signals?

The visitor scrolls a vertical feed of AI-generated persuasive sections for a fictional product
(FocusFlow). Each section tries a different persuasion angle. The system watches how the visitor
engages — dwell time, scroll depth, scroll direction, revisits — and asks the model to infer what
isn't landing and try something different next. It is **not** a chatbot: the interaction is
one-directional, closer to TikTok or Shorts than to a conversation.

The framing that makes this interesting: it's less a landing-page experiment than a **human
preference inference experiment disguised as a landing page.**

---

## Table of contents

1. [What it does](#what-it-does)
2. [Research design](#research-design)
3. [Ethics and the honest-persuasion stance](#ethics-and-the-honest-persuasion-stance)
4. [Architecture](#architecture)
5. [The session lifecycle](#the-session-lifecycle)
6. [Metrics](#metrics)
7. [The adaptive loop and prompt design](#the-adaptive-loop-and-prompt-design)
8. [The research dashboard](#the-research-dashboard)
9. [Setup](#setup)
10. [Cost](#cost)
11. [Deployment](#deployment)
12. [Known limitations and caveats](#known-limitations-and-caveats)
13. [Future directions](#future-directions)

---

## What it does

A visitor lands on a full-screen feed. Each screen is one persuasive "card" (rendered as a
full-bleed section, not a literal card) for FocusFlow, tagged with the persuasion angle it's using.
The visitor can only do three things: scroll down to the next argument, scroll back up to a previous
one, or sign up via the single CTA. There is no chat box, no rating, no slider, and no other button.

When the visitor reaches the last generated section, the next one is generated in the background
(prefetched) so the feed feels endless. If they out-scroll the prefetch, they hit a loading section
with a spinner rather than empty space.

A one-time disclosure screen at the start tells the visitor the page adapts to their behavior. A
close (X) button ends the session and shows an "Experiment complete" screen. Signing up shows a
"Converted" screen. Both end screens — and a dev-only sidebar available at all times — expose the
full metrics for the session, including a step-by-step timeline and copyable/exportable JSON.

---

## Research design

**Core question.** Can an AI discover increasingly effective arguments for one person from
interaction signals alone?

**Primary hypothesis.** An adaptive sequence of arguments outperforms a static landing page because
different people respond to different persuasive frames.

**Secondary hypothesis.** A small number of interactions may be enough for the system to infer which
arguments are likely to work.

**The ten persuasion angles** the model rotates through: social proof, convenience, curiosity,
identity, aspiration, cost savings, fear of missing out, objection handling, evidence, testimonial.

**What is deliberately measured:** behavior, not self-report. Implicit signals (dwell, scroll depth,
scroll direction, revisits, advance, conversion) are closer to real-world browsing than asking the
visitor to rate their own interest, which would make them self-conscious and change their behavior.

**What is deliberately NOT measured (in v1):** eye tracking, mouse tracking, webcam, biometrics,
emotion recognition, or any explicit interest input. These are noisy, high-friction, and (for the
invasive ones) ethically heavier than the question warrants.

---

## Ethics and the honest-persuasion stance

This prototype is a general-purpose adaptive-persuasion engine pointed at a harmless fictional
product. Because the mechanism — infer what makes a specific person susceptible, then adapt in real
time — is also the mechanism of manipulation, the build makes two deliberate choices so the system
is defensible as research rather than a covert manipulation tool:

1. **Disclosure.** A one-time intro screen tells the visitor the page adapts to their behavior. This
   is distinct from an interest slider (which the research design rightly avoids because self-report
   changes behavior). Disclosure doesn't ask the visitor to evaluate themselves; it just makes the
   experiment honest. The science — do different frames work on different people — survives
   disclosure completely intact.

2. **Constrained generation.** The model prompt forbids fabricated statistics, fake named customers,
   fake scarcity, and exploiting fear or insecurity. The angles compete on relevance, not pressure.
   Testimonials and social proof are clearly illustrative for a fictional product.

If this were ever put in front of real human subjects, the disclosure should stay, and the project
would want IRB review.

---

## Architecture

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn-style UI primitives, the Gemini
API (server-side), Vercel-compatible. State lives in client memory only — no database.

```
app/
  page.tsx                 Phase orchestration (intro → feed → converted / ended)
  layout.tsx               Fonts + metadata
  globals.css              Base styles
  api/generate/route.ts    Server route → Gemini; returns a validated card
components/
  IntroScreen.tsx          One-time disclosure
  PitchCard.tsx            A full-screen persuasive section + engagement tracking
  LoadingCard.tsx          Spinner section shown while the next card is generated
  ConvertedScreen.tsx      Post-CTA screen, with optional metrics
  EndScreen.tsx            Post-close "experiment complete" screen, with optional metrics
  MetricsView.tsx          Shared metrics panel: stats grid + step timeline + full JSON
  ResearchDashboard.tsx    Dev-only sidebar, always openable; same data as MetricsView
  FullJsonBlock.tsx        Collapsible full-JSON view with copy-to-clipboard
  ui/
    button.tsx             Button primitive
    spinner.tsx            SVG spinner
lib/
  useSession.ts            The core state machine: timing, event log, API calls, export
  metrics.ts               Pure deriver: turns the event log into all metrics + timeline
  gemini.ts                Prompt, schema validation, angle enforcement, varied fallbacks
  product.ts               Product + angle metadata (labels, hues)
  utils.ts                 cn() className helper
types/
  index.ts                 Shared types (Card, ActionEvent, CardRecord, AdaptContext)
```

**Design principle: one source of truth.** Every user action appends a typed event to an
append-only log in `useSession`. `metrics.ts` derives *everything* — stats, per-angle summaries, and
the step-by-step timeline — from that log on each render. The dashboard, the end-screen metrics, the
copyable JSON, and the downloaded export are all the same derived object, so they can never drift
apart.

---

## The session lifecycle

The app is a four-phase state machine driven by `useSession`:

`intro` → `feed` → `converted` (signed up) **or** `ended` (closed via X)

In the `feed` phase, the visitor scrolls through `PitchCard` sections. Each section uses an
`IntersectionObserver` at a 0.6 visibility threshold to declare itself the **active card** when it
dominates the viewport. `useSession.setActiveCard(index)` is the single entry point that:

- closes out the previously-active card (commits its dwell, logs an `advance` if the exit was
  downward),
- opens the new card (logs a `view` on first arrival or a `scroll_back` on a revisit, recording the
  arrival direction),
- triggers the prefetch of the next card when the last one becomes active.

This "single active card" model replaced an earlier design where `onVisible` / `onHidden` fired
independently. The earlier version produced duplicated and mis-attributed events when the visitor
scrolled up and back down (the observer fires for multiple sections during a scroll, and a stale
"active index" caused events to be logged against the wrong card). Centralizing on one
`setActiveCard` transition fixed the duplication, the wrong-card CTA attribution, and the
`still_viewing` outcome that used to appear on cards the visitor had actually signed up from.

A `terminal` latch makes `clickCta` and `close` idempotent: once the session ends, no further
terminal or view events are logged, so a double-click or an observer firing mid-unmount can't corrupt
the final record.

---

## Metrics

Everything is derived in `lib/metrics.ts` from the event log. Stored client-side only; exportable as
JSON.

**Primary**
- Cards viewed before CTA click

**Conversion / session**
- Converted (boolean), session length, sections viewed, drop-off section index, CTA angle

**Timing**
- Average and median time per section, longest dwell, total dwell, shortest dwell before an advance

**Advance behavior** (intentionally *not* framed as rejection)
- Advance count, split into **quick advances** (dwell under a threshold — bounced off) and **engaged
  advances** (dwell over the threshold — read it, then moved on to gather more before deciding)
- The threshold is `ENGAGED_DWELL_MS` (default 4000ms) at the top of `metrics.ts`

**Scroll-up behavior**
- Scroll-back count, count of revisited sections

**Per-angle summary**
- Average dwell and average scroll depth per angle, with counts

**Step-by-step timeline.** The centerpiece. `buildTimeline()` folds the event stream into one block
per card-visit, each recording: step number, card index, visit order (1 = first time, 2 = revisit),
angle, full card content (headline / subheadline / body), dwell for that visit, how the visitor
**arrived** (`start` / `down` / `up`), the **outcome**, and how they **left** (`down` / `up` /
`null`).

Outcomes: `advanced` (scrolled down), `scrolled_back_away` (scrolled up off it), `signed_up`,
`closed` (X or tab), `still_viewing` (the active card at capture time).

Two correctness details worth knowing:
- **Dwell is never reported as 0** for a card the visitor genuinely spent time on. The
  still-open final step falls back to the record's accumulated dwell (and then to elapsed-since-shown)
  so it always reflects real time on screen.
- **Direction is explicit in the JSON.** Every `view` / `advance` / `scroll_back` event carries a
  `direction`, and every timeline step exposes `arrived_by` and `left_by`, so a scroll-up to a prior
  card is unambiguous in the exported data.

---

## The adaptive loop and prompt design

On each prefetch, the client sends the model: the product, the **remaining** (unused) angles, session
stats, and the history of prior cards with their dwell and scroll signals. The model returns a single
JSON card.

Two design changes were made after early runs showed the model getting stuck — repeating the same
angle (e.g. five straight `convenience` cards) and producing near-identical copy in length, vocabulary,
and sentence structure:

1. **Angle exhaustion is enforced in code, not requested in prose.** `lib/gemini.ts` computes the
   unused angles and passes only those as the allowed set, framed as a hard constraint. After
   generation, if the model still returns a used angle, it retries once, then snaps to an allowed
   angle as a last resort. The model cannot repeat an angle until all ten are exhausted.

2. **A reasoning step precedes generation.** The output schema includes an `analysis` field the model
   must fill *first*, reasoning about the dwell/scroll signals and what kind of buyer they suggest
   before it writes the card. The prompt also demands deliberate variation in form (punchy vs.
   narrative vs. question vs. scenario), headline length, and vocabulary, and bans words a prior card
   already used. Temperature is raised (~1.15) for more lexical range.

**Output schema:**

```json
{
  "analysis": "string",
  "angle": "string",
  "headline": "string",
  "subheadline": "string",
  "body": "string",
  "inferred_user_state": "string",
  "reasoning_summary": "string"
}
```

The response is schema-validated. On any failure (no key, invalid JSON, malformed schema, transient
error), the route serves a **varied** built-in fallback card — one of ten distinct cards, one per
angle — so the app runs without an API key and a no-key test session still looks like a real,
varied session rather than the same card repeated.

**Model.** Configured for `gemini-flash-lite-latest`, which currently aliases to Gemini 3.1
Flash-Lite. Swapping to a heavier model (e.g. a Flash or Pro tier) is a one-line model-string change
if deeper per-card reasoning is wanted at higher cost/latency.

---

## The research dashboard

A dev-only sidebar (`ResearchDashboard`), openable at any time via a floating button, shows the live
metrics during a session: the stat grid, advance/scroll-up behavior, per-angle dwell, the
step-by-step timeline, the angles used, and the model's latest `inferred_user_state` /
`reasoning_summary`. At the bottom is a collapsible **Full JSON** block with a copy-to-clipboard
button, plus an **Export session JSON** button that downloads the complete record.

The same `MetricsView` (stat grid + expandable step timeline + full-JSON block + export) appears on
both end screens, so a researcher can inspect a finished session from the "Converted" or "Experiment
complete" screen without opening the sidebar.

The sidebar and the end-screen metrics options are gated on `NODE_ENV !== "production"`, so real
study participants in a production build never see them. The copyable JSON, the full-JSON block, and
the downloaded export are all the same payload shape.

---

## Setup

```bash
npm install
cp .env.example .env.local   # then add your Gemini key (optional for UI testing)
npm run dev
```

Open http://localhost:3000. Get a key at https://aistudio.google.com/apikey.

**Without a key,** the app runs fully on the built-in varied fallback cards, so you can develop and
test the UI, the scroll feed, and the metrics offline.

**Environment:**

```
GEMINI_API_KEY=your_key_here
```

The key is read only in the server-side route (`app/api/generate/route.ts` → `lib/gemini.ts`) and is
never exposed to the client.

---

## Cost

The model bills input and output tokens separately, each per million tokens. On the current
`gemini-flash-lite-latest` (Gemini 3.1 Flash-Lite) tier, that's roughly **$0.25 per million input**
and **$1.50 per million output** tokens. Output is ~6x the input price, so cost is dominated by what
the model writes, not what you send.

A rough estimate per card: ~700 input tokens (system prompt + product + accumulating history) and
~300 output tokens. A 5-card session is therefore on the order of ~3,600 input + ~1,500 output
tokens, which works out to roughly **$0.003 per full session** — about 330 sessions per dollar. A
retry on a repeated angle adds a little.

Two notes:
- The free tier (substantial daily request quota on Flash-Lite models) may cover prototyping
  entirely, so you may pay nothing during testing.
- The static system prompt is identical on every call; context-caching that prefix would cut input
  cost meaningfully at scale (cache reads are ~10% of base input price), though it isn't worth the
  complexity at prototype volumes.

These token counts are estimates from reading the prompt, not a measured count — use the SDK's
`countTokens()` on one live request for exact figures before projecting at scale.

---

## Deployment

1. Push to a Git repo.
2. Import into Vercel.
3. Add `GEMINI_API_KEY` under Project → Settings → Environment Variables.
4. Deploy. The dashboard and end-screen metrics are gated on `NODE_ENV !== "production"`, so they
   won't appear on the live deployment. To collect data in production, wire the export payload to
   your own logging endpoint.

---

## Known limitations and caveats

- **Strict Mode is off.** `reactStrictMode` is disabled in `next.config.mjs` because the metrics
  depend on effects firing once; Strict Mode's intentional double-invoke in dev otherwise duplicated
  events. This is a reasonable call for an instrumented prototype but does turn off a genuine dev
  safeguard — keep it in mind when extending the app. The `setActiveCard` dedupe also guards against
  duplication independently, so the config change is belt-and-braces.
- **`beforeunload` is best-effort.** Tab-close "leave" capture via `beforeunload` is increasingly
  throttled by browsers. For reliable drop-off data in a real study, move to
  `visibilitychange` + `navigator.sendBeacon` to a logging endpoint. The in-app X button captures a
  clean `leave` event regardless.
- **Per-angle "effectiveness" is descriptive only.** With one card per angle per session, you can't
  infer causal lift without the multi-session or simulated-user setup below.
- **The 0.6 active-card threshold** assumes full-viewport sections. If sections ever become shorter
  than the viewport, two could exceed 0.6 simultaneously and the active card could flip-flop.
- **The `analysis` and reasoning fields are paid output tokens** the visitor never sees. They're a
  deliberate trade (better reasoning for a few cents per thousand runs); trimming them is the
  highest-leverage cost cut if needed.
- **Token/cost figures are estimates**, not measured counts.
- **No persistence.** State is client-memory only by design. Refreshing loses the session unless
  it's been exported.

---

## Future directions

- **Hidden personas.** Seed the model with a hidden visitor profile (founder, student, designer,
  engineer, accountant) and compare adaptation strategies across personas.
- **Multi-agent simulation.** A "Sales AI" vs. a "User AI" to generate thousands of simulated
  sessions before testing on humans — this is also what would make per-angle effectiveness causal.
- **Visual variants.** Generated layouts, diagrams, or screenshots per card while preserving the same
  adaptive loop.
- **Reinforcement-learning framing.** State = interaction history, action = next persuasion angle,
  reward = conversion. The system becomes a persuasion-optimization environment.

Keep the disclosure if real subjects are ever involved.