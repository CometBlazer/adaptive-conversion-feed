import { NextResponse } from "next/server";
import { buildSessionProfile, type ProfileInput } from "@/lib/gemini";

export const runtime = "nodejs";

// End-of-session profile: runs server-side so the Gemini key stays off the client.
export async function POST(req: Request) {
  let input: ProfileInput;
  try {
    input = (await req.json()) as ProfileInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const profile = await buildSessionProfile(input);
  return NextResponse.json({ profile });
}
