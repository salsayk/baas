import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";
import { getAuthenticatedUser } from "@/app/lib/auth";

type TranslationRow = {
  id: number;
  screen_id: number;
  screen_name: string;
  source_text: string;
  language_id: number;
  translated_text: string;
  language_name: string;
};

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const languageId = searchParams.get("language_id");
  const screenId = searchParams.get("screen_id");

  const client = getDbClient();
  try {
    await client.connect();
    let result;
    const langId = languageId ? Number(languageId) : null;
    const scrId = screenId ? Number(screenId) : null;

    if (langId && (!Number.isInteger(langId) || langId < 1)) {
      return NextResponse.json({ error: "language_id must be a positive integer" }, { status: 400 });
    }
    if (scrId !== null && (!Number.isInteger(scrId) || scrId < 1)) {
      return NextResponse.json({ error: "screen_id must be a positive integer" }, { status: 400 });
    }

    if (langId && scrId) {
      result = await client.query<TranslationRow>(
        `SELECT t.id, t.screen_id, s.screen_name, t.source_text, t.language_id, t.translated_text, l.language_name
         FROM languages_screens_translations t
         JOIN languages l ON l.id = t.language_id
         JOIN languages_screens s ON s.id = t.screen_id
         WHERE t.language_id = $1 AND t.screen_id = $2
         ORDER BY t.source_text ASC`,
        [langId, scrId]
      );
    } else if (langId) {
      result = await client.query<TranslationRow>(
        `SELECT t.id, t.screen_id, s.screen_name, t.source_text, t.language_id, t.translated_text, l.language_name
         FROM languages_screens_translations t
         JOIN languages l ON l.id = t.language_id
         JOIN languages_screens s ON s.id = t.screen_id
         WHERE t.language_id = $1
         ORDER BY s.screen_name ASC, t.source_text ASC`,
        [langId]
      );
    } else if (scrId) {
      result = await client.query<TranslationRow>(
        `SELECT t.id, t.screen_id, s.screen_name, t.source_text, t.language_id, t.translated_text, l.language_name
         FROM languages_screens_translations t
         JOIN languages l ON l.id = t.language_id
         JOIN languages_screens s ON s.id = t.screen_id
         WHERE t.screen_id = $1
         ORDER BY t.source_text ASC, t.language_id ASC`,
        [scrId]
      );
    } else {
      result = await client.query<TranslationRow>(
        `SELECT t.id, t.screen_id, s.screen_name, t.source_text, t.language_id, t.translated_text, l.language_name
         FROM languages_screens_translations t
         JOIN languages l ON l.id = t.language_id
         JOIN languages_screens s ON s.id = t.screen_id
         ORDER BY s.screen_name ASC, t.source_text ASC, t.language_id ASC`
      );
    }
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching translations:", error);
    return NextResponse.json({ error: "Failed to fetch translations" }, { status: 500 });
  } finally {
    await client.end();
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getDbClient();
  try {
    const body = await request.json();
    const sourceText = String(body.source_text ?? "").trim();
    const translatedText = String(body.translated_text ?? "").trim();
    const languageId = Number(body.language_id);
    const screenId = Number(body.screen_id);

    if (!sourceText) {
      return NextResponse.json({ error: "source_text is required" }, { status: 400 });
    }
    if (!translatedText) {
      return NextResponse.json({ error: "translated_text is required" }, { status: 400 });
    }
    if (!Number.isInteger(languageId) || languageId < 1) {
      return NextResponse.json({ error: "language_id must be a positive integer" }, { status: 400 });
    }
    if (!Number.isInteger(screenId) || screenId < 1) {
      return NextResponse.json({ error: "screen_id must be a positive integer" }, { status: 400 });
    }

    await client.connect();
    const result = await client.query(
      `INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (screen_id, language_id, source_text)
       DO UPDATE SET translated_text = EXCLUDED.translated_text
       RETURNING id, screen_id, source_text, language_id, translated_text`,
      [screenId, sourceText, languageId, translatedText]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error upserting translation:", error);
    return NextResponse.json({ error: "Failed to upsert translation" }, { status: 500 });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
