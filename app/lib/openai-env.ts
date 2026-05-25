import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** Parse OPENAI_API_KEY from .env.local / .env (source of truth for local dev). */
function parseOpenAiKeyFromEnvFiles(): { found: boolean; value: string } {
  for (const file of [".env.local", ".env"]) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;
    try {
      const content = readFileSync(path, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        if (key !== "OPENAI_API_KEY") continue;
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return { found: true, value };
      }
    } catch {
      continue;
    }
  }
  return { found: false, value: "" };
}

/** How OPENAI_API_KEY is set (no secret values exposed to clients). */
export function resolveOpenAiKeyForRequest(bodyOpenAiApiKey?: string): string | null {
  const { requiresUserOpenAiKey, openaiConfigured } = getOpenAiEnvStatus();
  if (openaiConfigured) {
    const fromFile = parseOpenAiKeyFromEnvFiles();
    if (fromFile.found) {
      const v = fromFile.value.trim();
      if (v) return v;
    }
    const env = process.env.OPENAI_API_KEY?.trim();
    if (env) return env;
  }
  if (requiresUserOpenAiKey) {
    const fromBody = bodyOpenAiApiKey?.trim();
    if (fromBody) return fromBody;
  }
  return null;
}

export function getOpenAiEnvStatus() {
  const fromFile = parseOpenAiKeyFromEnvFiles();
  const fromProcess = process.env.OPENAI_API_KEY;

  // .env.local / .env win when the line exists (even OPENAI_API_KEY= with no value).
  if (fromFile.found) {
    const openaiConfigured = Boolean(fromFile.value.trim());
    return {
      openaiKeyDefined: true,
      openaiConfigured,
      requiresUserOpenAiKey: !openaiConfigured,
    };
  }

  const openaiKeyDefined = fromProcess !== undefined;
  const openaiConfigured = Boolean(fromProcess?.trim());
  const requiresUserOpenAiKey = openaiKeyDefined && !openaiConfigured;

  return { openaiKeyDefined, openaiConfigured, requiresUserOpenAiKey };
}
