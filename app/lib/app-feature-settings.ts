import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface AppFeatureSettings {
  EnableEmailVerification: boolean;
}

const DEFAULTS: AppFeatureSettings = {
  EnableEmailVerification: true,
};

const CONFIG_FILENAME = "app-feature-settings.json";
const CONFIG_DIR = "config";

let cached: AppFeatureSettings | null = null;

/**
 * Reads `config/app-feature-settings.json` from the project root.
 * Missing file or invalid JSON falls back to defaults.
 */
export function getAppFeatureSettings(): AppFeatureSettings {
  if (cached) return cached;

  const configPath = join(process.cwd(), CONFIG_DIR, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    cached = { ...DEFAULTS };
    return cached;
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    cached = {
      EnableEmailVerification:
        typeof raw.EnableEmailVerification === "boolean"
          ? raw.EnableEmailVerification
          : DEFAULTS.EnableEmailVerification,
    };
    return cached;
  } catch {
    cached = { ...DEFAULTS };
    return cached;
  }
}
