import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";
import { getAuthenticatedUser } from "@/app/lib/auth";
import type { Language, CreateLanguageInput } from "@/database/Languages/types";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getDbClient();
  await client.connect();
  try {
    const result = await client.query<Language>(
      "SELECT id, language_name, direction FROM languages ORDER BY id ASC"
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching languages:", error);
    return NextResponse.json(
      { error: "Failed to fetch languages" },
      { status: 500 }
    );
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
  await client.connect();
  try {
    const body: CreateLanguageInput = await request.json();

    if (!body.language_name?.trim()) {
      return NextResponse.json(
        { error: "Language name is required" },
        { status: 400 }
      );
    }

    if (body.direction !== 0 && body.direction !== 1) {
      return NextResponse.json(
        { error: "Direction must be 0 (LTR) or 1 (RTL)" },
        { status: 400 }
      );
    }

    const result = await client.query<Language>(
      `INSERT INTO languages (language_name, direction)
       VALUES ($1, $2)
       RETURNING id, language_name, direction`,
      [body.language_name.trim(), body.direction]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating language:", error);
    return NextResponse.json(
      { error: "Failed to create language" },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
