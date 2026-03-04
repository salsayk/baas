import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getDbClient } from "@/database/accounts/db-client";
import { getAuthenticatedUser } from "@/app/lib/auth";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getDbClient();
  try {
    await client.connect();
    const sqlPath = join(process.cwd(), "database", "Translations", "create-ui-translations-table.sql");
    const sql = await readFile(sqlPath, "utf-8");
    await client.query(sql);
    return NextResponse.json({ ok: true, message: "Translations migration completed" });
  } catch (error) {
    console.error("Translations migration failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to run translations migration" },
      { status: 500 }
    );
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
