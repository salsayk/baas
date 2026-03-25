import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";

export const dynamic = "force-dynamic";

type TranslationRow = {
  source_text: string;
  translated_text: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLanguageId = searchParams.get("languageId");
  const languageId = rawLanguageId ? parseInt(rawLanguageId, 10) : 1;
  const safeLanguageId = Number.isNaN(languageId) ? 1 : languageId;

  const client = getDbClient();
  try {
    await client.connect();

    let rows = (
      await client.query<TranslationRow>(
        `SELECT DISTINCT ON (source_text) source_text, translated_text
         FROM languages_screens_translations
         WHERE language_id = $1
         ORDER BY source_text, screen_id`,
        [safeLanguageId]
      )
    ).rows;

    // Fallback to English translations if selected language has no rows yet
    if (rows.length === 0 && safeLanguageId !== 1) {
      rows = (
        await client.query<TranslationRow>(
          `SELECT DISTINCT ON (source_text) source_text, translated_text
           FROM languages_screens_translations
           WHERE language_id = 1
           ORDER BY source_text, screen_id`
        )
      ).rows;
    }

    const dictionary = rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.source_text] = row.translated_text;
      return acc;
    }, {});

    return NextResponse.json(dictionary, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    return NextResponse.json({});
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
