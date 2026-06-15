import { NextResponse } from "next/server";
import { generateCard } from "@/lib/gemini";
import type { AdaptContext } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let ctx: AdaptContext;
  try {
    ctx = (await req.json()) as AdaptContext;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { card, usedFallback } = await generateCard(ctx);
  return NextResponse.json({ card, usedFallback });
}
