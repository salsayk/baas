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

function parseBoolean(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return null;
}

function loadConfigFromEnv() {
  const host = process.env.PGHOST?.trim();
  const database = process.env.PGDATABASE?.trim();
  const username = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD;

  if (!host || !database || !username || !password) return null;

  const portRaw = process.env.PGPORT?.trim();
  const port = portRaw ? Number.parseInt(portRaw, 10) : 5432;
  if (!Number.isFinite(port) || port <= 0) return null;

  const sslFromEnv = parseBoolean(process.env.PGSSL);

  return {
    host,
    port,
    database,
    username,
    password,
    ssl: sslFromEnv ?? false,
  };
}

function loadConfig() {
  if (config) return config;
  const envConfig = loadConfigFromEnv();
  if (envConfig) {
    config = envConfig;
    return config;
  }
  try {
    const configPath = join(process.cwd(), "database", "db-config.json");
    const raw = JSON.parse(readFileSync(configPath, "utf-8"));
    config = raw.postgresql;
    return config!;
  } catch (err) {
    throw new Error(
      "Failed to load DB config. Set PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD (and optionally PGSSL) " +
        "or provide database/db-config.json. Details: " +
        (err instanceof Error ? err.message : String(err))
    );
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
