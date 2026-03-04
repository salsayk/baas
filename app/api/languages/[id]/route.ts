import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";
import { getAuthenticatedUser } from "@/app/lib/auth";
import type { Language, UpdateLanguageInput } from "@/database/Languages/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const languageId = parseInt(id, 10);
  if (isNaN(languageId)) {
    return NextResponse.json({ error: "Invalid language ID" }, { status: 400 });
  }

  const client = getDbClient();
  await client.connect();
  try {
    const body: UpdateLanguageInput = await request.json();

    const fields: string[] = [];
    const values: (string | number)[] = [];
    let idx = 1;

    if (body.language_name !== undefined) {
      if (!body.language_name.trim()) {
        return NextResponse.json(
          { error: "Language name cannot be empty" },
          { status: 400 }
        );
      }
      fields.push(`language_name = $${idx++}`);
      values.push(body.language_name.trim());
    }

    if (body.direction !== undefined) {
      if (body.direction !== 0 && body.direction !== 1) {
        return NextResponse.json(
          { error: "Direction must be 0 (LTR) or 1 (RTL)" },
          { status: 400 }
        );
      }
      fields.push(`direction = $${idx++}`);
      values.push(body.direction);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(languageId);
    const result = await client.query<Language>(
      `UPDATE languages SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, language_name, direction`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating language:", error);
    return NextResponse.json(
      { error: "Failed to update language" },
      { status: 500 }
    );
  } finally {
    await client.end();
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
  const languageId = parseInt(id, 10);
  if (isNaN(languageId)) {
    return NextResponse.json({ error: "Invalid language ID" }, { status: 400 });
  }

  // Prevent deletion of the first 2 records (English and Hebrew)
  if (languageId === 1 || languageId === 2) {
    return NextResponse.json(
      { error: "Cannot delete default languages (English and Hebrew)" },
      { status: 403 }
    );
  }

  const client = getDbClient();
  await client.connect();
  try {
    const result = await client.query(
      "DELETE FROM languages WHERE id = $1",
      [languageId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting language:", error);
    return NextResponse.json(
      { error: "Failed to delete language" },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
