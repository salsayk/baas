export interface UiScreen {
  screen_id: number;
  screen_name: string;
  screen_description: string | null;
  /** From `ui_screen_translations` (+ API may merge `languages_screens_translations`); else English `screen_name`. */
  localized_name?: string;
  /** From `ui_screen_translations.description` (+ phrase fallback by `source_text = screen_description`); else `screen_description`. */
  localized_description?: string | null;
}

/** Display label from API (`localized_name` includes `ui_screen_translations` + phrase fallback). */
export function resolveUiScreenDisplayName(screen: {
  screen_name: string;
  localized_name?: string | null;
}): string {
  return screen.localized_name ?? screen.screen_name;
}

/** Display description from API; empty/absent falls back to English `screen_description`. */
export function resolveUiScreenDisplayDescription(screen: {
  screen_description: string | null;
  localized_description?: string | null;
}): string | null {
  const loc = screen.localized_description;
  if (loc != null && String(loc).trim() !== "") return loc;
  return screen.screen_description;
}

export interface CreateUiScreenInput {
  screen_name: string;
  screen_description?: string | null;
}

export interface UpdateUiScreenInput {
  screen_name?: string;
  screen_description?: string | null;
}
