import { NextResponse } from "next/server";
import { reflectOnAction, type ReflectionInput } from "@/lib/gemini";

export const runtime = "nodejs";

// Post-action reflection: runs server-side so the Gemini key stays off the client.
export async function POST(req: Request) {
  let input: ReflectionInput;
  try {
    input = (await req.json()) as ReflectionInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const reflection = await reflectOnAction(input);
  return NextResponse.json({ reflection });
}
