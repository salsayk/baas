import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import { Resend } from "resend";
import nodemailer from "nodemailer";

const CODE_EXPIRY_MINUTES = 15;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Timese <onboarding@resend.dev>";
const SMTP_ALLOW_RESEND_FALLBACK =
  String(process.env.SMTP_ALLOW_RESEND_FALLBACK ?? "false").toLowerCase() === "true";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hasSmtpConfig(): boolean {
  return Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_PORT &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASS &&
      process.env.MAIL_FROM
  );
}

function sanitizeSmtpError(error: unknown): { reason: string; code?: string; responseCode?: number } {
  if (!(error instanceof Error)) {
    return { reason: "Unknown SMTP error" };
  }

  const e = error as Error & {
    code?: string;
    responseCode?: number;
    message?: string;
  };

  const code = e.code;
  const responseCode = e.responseCode;
  const rawMessage = String(e.message ?? "");

  // Keep only a short safe message; remove line breaks and truncate.
  const compact = rawMessage.replace(/\s+/g, " ").trim().slice(0, 220);

  // Provide a high-signal sanitized hint by known SMTP auth/network classes.
  if (code === "EAUTH" || responseCode === 535 || responseCode === 534) {
    return {
      reason:
        "SMTP authentication failed. For Gmail, use an App Password (2-Step Verification required).",
      code,
      responseCode,
    };
  }
  if (code === "ECONNECTION" || code === "ETIMEDOUT") {
    return {
      reason:
        "SMTP connection failed (host/port/secure/network). Verify MAIL_HOST/MAIL_PORT/MAIL_SECURE.",
      code,
      responseCode,
    };
  }
  if (responseCode === 550 || responseCode === 553) {
    return {
      reason: "SMTP rejected sender/recipient address. Verify MAIL_FROM and target email format.",
      code,
      responseCode,
    };
  }

  return {
    reason: compact || "SMTP send failed",
    code,
    responseCode,
  };
}

async function sendWithSmtp(email: string, code: string): Promise<void> {
  const host = process.env.MAIL_HOST!;
  const port = parseInt(process.env.MAIL_PORT!, 10);
  const secureRaw = String(process.env.MAIL_SECURE ?? "").toLowerCase();
  const secure = secureRaw === "true" || secureRaw === "1";
  const user = process.env.MAIL_USER!;
  const pass = process.env.MAIL_PASS!;
  const from = process.env.MAIL_FROM!;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Your Timese account verification code",
    text: `Your verification code is: ${code}\n\nIt expires in ${CODE_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
  });
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
    if (typeof rawEmail !== "string" || !rawEmail.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(rawEmail);
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    const client = getDbClient();
    await client.connect();
    try {
      await client.query(
        `INSERT INTO email_verification_codes (email, code, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
        [email, code, expiresAt]
      );
    } finally {
      await client.end();
    }

    // Primary: SMTP (e.g. Gmail)
    if (hasSmtpConfig()) {
      try {
        await sendWithSmtp(email, code);
        return NextResponse.json({ ok: true, provider: "smtp" });
      } catch (smtpErr) {
        console.error("SMTP send failed:", smtpErr);
        const smtpDetails = sanitizeSmtpError(smtpErr);
        if (!SMTP_ALLOW_RESEND_FALLBACK) {
          return NextResponse.json(
            {
              error: "SMTP is configured but failed to send. Resend fallback is disabled.",
              details: smtpDetails,
              provider: "smtp",
            },
            { status: 500 }
          );
        }
        console.warn("SMTP fallback enabled, trying Resend...");
      }
    }

    // Fallback: existing Resend flow
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("SMTP and RESEND not available; skipping send. Code for dev:", code);
      return NextResponse.json({
        ok: true,
        message: "Code stored (dev mode, no provider configured)",
        provider: "none",
      });
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: "Your Timese account verification code",
      text: `Your verification code is: ${code}\n\nIt expires in ${CODE_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, provider: "resend" });
  } catch (err) {
    console.error("Verify email send error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
