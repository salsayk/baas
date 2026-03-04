import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeCode(code: string): string {
  return String(code).replace(/\D/g, "").slice(0, 6);
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawEmail = body.email;
    const rawCode = body.code;
    if (typeof rawEmail !== "string" || !rawEmail.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    if (typeof rawCode !== "string" || !rawCode) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(rawEmail);
    const code = normalizeCode(rawCode);
    if (code.length !== 6) {
      return NextResponse.json(
        { error: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT 1 FROM email_verification_codes
         WHERE email = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP`,
        [email, code]
      );
      if (res.rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired code" },
          { status: 400 }
        );
      }
      await client.query(
        "DELETE FROM email_verification_codes WHERE email = $1",
        [email]
      );
    } finally {
      await client.end();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Verify email verify error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
