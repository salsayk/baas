import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getOpenAiEnvStatus } from "@/app/lib/openai-env";

/** Playground UI: whether OPENAI_API_KEY is declared but empty (no secret values returned). */
export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  return NextResponse.json(getOpenAiEnvStatus());
}
