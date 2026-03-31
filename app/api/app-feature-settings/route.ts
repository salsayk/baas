import { NextResponse } from "next/server";
import { getAppFeatureSettings } from "@/app/lib/app-feature-settings";

/** Public read of safe feature toggles for client-side UX (e.g. skip email verification modal). */
export async function GET() {
  try {
    const settings = getAppFeatureSettings();
    return NextResponse.json({
      EnableEmailVerification: settings.EnableEmailVerification,
    });
  } catch (err) {
    console.error("app-feature-settings GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
