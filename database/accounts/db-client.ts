import pg from "pg";
import { readFileSync } from "fs";
import { join } from "path";

let config: {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
} | null = null;

function loadConfig() {
  if (config) return config;
  try {
    const configPath = join(process.cwd(), "database", "db-config.json");
    const raw = JSON.parse(readFileSync(configPath, "utf-8"));
    config = raw.postgresql;
    return config!;
  } catch (err) {
    throw new Error("Failed to load db-config.json: " + (err instanceof Error ? err.message : String(err)));
  }
}

export function getDbClient() {
  const c = loadConfig();
  return new pg.Client({
    host: c.host,
    port: c.port,
    database: c.database,
    user: c.username,
    password: c.password,
    ssl: c.ssl ? { rejectUnauthorized: false } : false,
  });
}
