import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";
import { getAuthenticatedUser } from "@/app/lib/auth";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getDbClient();
  try {
    await client.connect();
    const result = await client.query<{ id: number; screen_name: string }>(
      "SELECT id, screen_name FROM languages_screens ORDER BY id ASC"
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching screens:", error);
    return NextResponse.json(
      { error: "Failed to fetch screens" },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
