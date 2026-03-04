import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";
import type { Language } from "@/database/Languages/types";

export async function GET() {
  const client = getDbClient();
  try {
    await client.connect();
    const result = await client.query<Language>(
      "SELECT id, language_name, direction FROM languages ORDER BY id ASC"
    );
    await client.end();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching languages:", error);
    try { await client.end(); } catch {}
    // Return default languages if table doesn't exist yet
    return NextResponse.json([
      { id: 1, language_name: "English", direction: 0 },
      { id: 2, language_name: "עברית", direction: 1 },
    ]);
  }
}
