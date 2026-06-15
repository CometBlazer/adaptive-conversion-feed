# Adaptive Conversion Feed

A research prototype exploring **adaptive persuasion**: can a model discover increasingly
effective arguments for a specific visitor using only implicit interaction signals?

The visitor sees a feed of AI-generated persuasive cards for a fictional product (FocusFlow).
After each card they can click the CTA or ask for another reason. The system observes dwell
time, scroll depth, and action sequence, then asks Gemini to try a different angle.

It is **not** a chatbot — the interaction is one-directional, closer to an infinite-scroll feed.

## What's different from the original spec

Two deliberate changes make this defensible as research rather than a covert manipulation engine:

1. **A one-time disclosure screen** tells the visitor the page adapts to their behavior. The
   original "no slider" reasoning was about self-report changing behavior — disclosure is not a
   slider, and the core science (do different frames work on different people?) survives it intact.
2. **The model prompt is constrained to honest persuasion**: no fabricated stats, no fake scarcity,
   no exploiting emotional vulnerability. The angles compete on relevance, not pressure.

Everything else — the full adaptive loop, the rich metrics, the dev dashboard — is as specified.

## Quick start

```bash
npm install
cp .env.example .env.local   # then add your Gemini key
npm run dev
```

Open http://localhost:3000. Get a key at https://aistudio.google.com/apikey.

Without a key, the app still runs and serves deterministic fallback cards, so you can develop the
UI offline.

## Environment

```
GEMINI_API_KEY=your_key_here
```

The key is read only in the server-side route (`app/api/generate/route.ts` → `lib/gemini.ts`) and
is never exposed to the client.

## Architecture

```
app/
  page.tsx              Phase orchestration (intro → feed → converted)
  layout.tsx            Fonts + metadata
  api/generate/route.ts Server route → Gemini, schema-validated
components/
  IntroScreen.tsx       One-time disclosure
  PitchCard.tsx         The persuasive card + scroll tracking
  ConvertedScreen.tsx   Post-CTA screen
  ResearchDashboard.tsx Dev-only metrics panel + JSON export
lib/
  useSession.ts         State machine, dwell timing, event log, API calls
  metrics.ts            Derives all metrics from the raw event log
  gemini.ts             Prompt, schema validation, fallback
  product.ts            Product + angle metadata
types/index.ts          Shared types
```

Data flow: every action appends a typed event to an append-only log. `metrics.ts` derives all
metrics from that log on each render, so the dashboard and the export are always consistent.

## Metrics captured

Primary: cards viewed before CTA click.

Secondary: conversion status, session length, cards viewed, drop-off card, angles used,
converting angle, average and median time per card, fastest reject, slowest dwell, total dwell,
average scroll depth, re-request count, per-angle dwell/scroll summary, and the full action
sequence for replay.

Storage is **client state only**. The dev dashboard's **Export session JSON** button downloads the
complete record (cards, events, derived metrics) for offline analysis — no database required.

## The adaptive loop

On each "show another reason", the client sends card history, angles used, and session stats to
Gemini, which returns:

```json
{
  "headline": "string",
  "subheadline": "string",
  "body": "string",
  "angle": "string",
  "inferred_user_state": "string",
  "reasoning_summary": "string"
}
```

The response is schema-validated; invalid output falls back to a safe default card.

## Deploy to Vercel

1. Push to a Git repo.
2. Import into Vercel.
3. Add `GEMINI_API_KEY` under Project → Settings → Environment Variables.
4. Deploy. The dashboard is gated on `NODE_ENV !== "production"`, so it won't appear on the live
   deployment. To collect data in production, wire the export payload to your own logging endpoint.

## Future directions

Hidden personas, multi-agent simulation (Sales AI vs User AI), visual card variants, and an RL
framing (state = interaction history, action = next angle, reward = conversion) all sit naturally
on top of this loop. Keep the disclosure if you ever put real subjects in front of it.
