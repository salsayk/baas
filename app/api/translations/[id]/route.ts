import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";
import { getAuthenticatedUser } from "@/app/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId < 1) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const client = getDbClient();
  try {
    const body = await request.json();
    const sourceText = body.source_text !== undefined ? String(body.source_text).trim() : undefined;
    const translatedText = body.translated_text !== undefined ? String(body.translated_text).trim() : undefined;
    const languageId = body.language_id !== undefined ? Number(body.language_id) : undefined;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (sourceText !== undefined) {
      if (!sourceText) {
        return NextResponse.json({ error: "source_text cannot be empty" }, { status: 400 });
      }
      fields.push(`source_text = $${idx++}`);
      values.push(sourceText);
    }

    if (translatedText !== undefined) {
      if (!translatedText) {
        return NextResponse.json({ error: "translated_text cannot be empty" }, { status: 400 });
      }
      fields.push(`translated_text = $${idx++}`);
      values.push(translatedText);
    }

    if (languageId !== undefined) {
      if (!Number.isInteger(languageId) || languageId < 1) {
        return NextResponse.json({ error: "language_id must be a positive integer" }, { status: 400 });
      }
      fields.push(`language_id = $${idx++}`);
      values.push(languageId);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await client.connect();
    const result = await client.query(
      `UPDATE languages_screens_translations
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING id, screen_id, source_text, language_id, translated_text`,
      [...values, rowId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating translation:", error);
    return NextResponse.json({ error: "Failed to update translation" }, { status: 500 });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId < 1) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const client = getDbClient();
  try {
    await client.connect();
    const result = await client.query(
      `DELETE FROM languages_screens_translations
       WHERE id = $1
       RETURNING id`,
      [rowId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting translation:", error);
    return NextResponse.json({ error: "Failed to delete translation" }, { status: 500 });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
