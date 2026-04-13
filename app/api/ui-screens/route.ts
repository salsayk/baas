import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateUiScreenInput } from "@/database/screens/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawLang = searchParams.get("language_id");
    const languageId = rawLang != null && rawLang !== "" ? parseInt(rawLang, 10) : null;
    const useLang =
      languageId != null && Number.isInteger(languageId) && languageId >= 1 ? languageId : null;

    const client = getDbClient();
    await client.connect();
    try {
      let res;
      if (useLang != null) {
        // Match translations by the selected language row's `language_name`, not only `id`, so rows
        // seeded with another id for the same language (e.g. עברית as id 2 vs 5) still resolve.
        res = await client.query(
          `SELECT us.screen_id,
                  us.screen_name,
                  us.screen_description,
                  COALESCE(
                    ut.name,
                    (SELECT lst.translated_text
                     FROM languages_screens_translations lst
                     WHERE lst.source_text = us.screen_name
                       AND EXISTS (
                         SELECT 1
                         FROM languages ul
                         WHERE ul.id = lst.language_id
                           AND ul.language_name = (SELECT language_name FROM languages WHERE id = $1::bigint LIMIT 1)
                       )
                     ORDER BY lst.screen_id
                     LIMIT 1),
                    us.screen_name
                  ) AS localized_name,
                  COALESCE(
                    ut.description,
                    (SELECT lst2.translated_text
                     FROM languages_screens_translations lst2
                     WHERE us.screen_description IS NOT NULL
                       AND lst2.source_text = us.screen_description
                       AND EXISTS (
                         SELECT 1
                         FROM languages ul2
                         WHERE ul2.id = lst2.language_id
                           AND ul2.language_name = (SELECT language_name FROM languages WHERE id = $1::bigint LIMIT 1)
                       )
                     ORDER BY lst2.screen_id
                     LIMIT 1),
                    us.screen_description
                  ) AS localized_description
           FROM ui_screens us
           LEFT JOIN LATERAL (
             SELECT u.name, u.description
             FROM ui_screen_translations u
             WHERE u.screen_id = us.screen_id
               AND EXISTS (
                 SELECT 1
                 FROM languages ul
                 WHERE ul.id = u.language_id
                   AND ul.language_name = (SELECT language_name FROM languages WHERE id = $1::bigint LIMIT 1)
               )
             LIMIT 1
           ) ut ON true
           ORDER BY us.screen_name`,
          [useLang]
        );
      } else {
        res = await client.query(
          `SELECT screen_id, screen_name, screen_description,
                  screen_name AS localized_name,
                  screen_description AS localized_description
           FROM ui_screens
           ORDER BY screen_name`
        );
      }
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screens GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body: CreateUiScreenInput = await request.json();
    if (!body.screen_name?.trim()) {
      return NextResponse.json(
        { error: "Screen name is required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO ui_screens (screen_name, screen_description)
         VALUES ($1, $2)
         RETURNING screen_id, screen_name, screen_description`,
        [body.screen_name.trim(), body.screen_description?.trim() || null]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screens POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
