import { NextResponse } from "next/server";
import { getDbClient } from "@/database/accounts/db-client";

export async function POST() {
  const client = getDbClient();
  await client.connect();
  try {
    // Create the languages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS languages (
        id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        language_name  VARCHAR(100) NOT NULL,
        direction      SMALLINT NOT NULL DEFAULT 0 CHECK (direction IN (0, 1))
      )
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_languages_name ON languages(language_name)
    `);

    // Check if default languages exist
    const existing = await client.query("SELECT id FROM languages WHERE id IN (1, 2)");
    
    if (existing.rowCount === 0) {
      // Insert default languages
      await client.query(`
        INSERT INTO languages (language_name, direction) VALUES ('English', 0)
      `);
      await client.query(`
        INSERT INTO languages (language_name, direction) VALUES ('עברית', 1)
      `);
    }

    return NextResponse.json({ success: true, message: "Languages table created and seeded" });
  } catch (error) {
    console.error("Error running migration:", error);
    return NextResponse.json(
      { error: "Failed to run migration", details: String(error) },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
