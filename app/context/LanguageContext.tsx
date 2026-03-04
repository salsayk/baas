"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

type Direction = "ltr" | "rtl";

interface LanguageOption {
  id: number;
  language_name: string;
  direction: 0 | 1;
}

interface LanguageContextType {
  languageId: number;
  dir: Direction;
  languages: LanguageOption[];
  mounted: boolean;
  setLanguageId: (id: number) => void;
  refreshLanguages: () => Promise<void>;
}

const LANG_STORAGE_KEY = "timese-lang-id";

const defaultLanguages: LanguageOption[] = [
  { id: 1, language_name: "English", direction: 0 },
  { id: 2, language_name: "עברית", direction: 1 },
];

const LanguageContext = createContext<LanguageContextType>({
  languageId: 1,
  dir: "ltr",
  languages: defaultLanguages,
  mounted: false,
  setLanguageId: () => {},
  refreshLanguages: async () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [languageId, setLanguageIdState] = useState<number>(1);
  const [languages, setLanguages] = useState<LanguageOption[]>(defaultLanguages);
  const [mounted, setMounted] = useState(false);

  // Find current language - ensure id comparison works with both string and number
  const currentLang = useMemo(() => {
    const found = languages.find((l) => Number(l.id) === Number(languageId));
    return found ?? languages[0];
  }, [languages, languageId]);

  // Compute direction from current language's direction field (handle both string "1" and number 1)
  const currentDirection = Number(currentLang?.direction ?? 0);
  
  // Always return "ltr" during SSR, only return actual direction after mount
  const dir: Direction = mounted && currentDirection === 1 ? "rtl" : "ltr";

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch("/api/languages/public");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Ensure direction is a number
          const normalized = data.map((l: LanguageOption) => ({
            ...l,
            id: Number(l.id),
            direction: Number(l.direction) as 0 | 1,
          }));
          setLanguages(normalized);
        }
      }
    } catch {
      // Keep default languages on error
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (stored) {
        const id = parseInt(stored, 10);
        if (!isNaN(id)) {
          setLanguageIdState(id);
        }
      }
    }
    fetchLanguages();
  }, [fetchLanguages]);

  // Update document direction when language changes
  useEffect(() => {
    if (!mounted) return;
    // Find the language directly in the effect to avoid stale closure issues
    const lang = languages.find((l) => Number(l.id) === Number(languageId));
    const langDirection = Number(lang?.direction ?? 0);
    const isRtl = langDirection === 1;
    const newDir = isRtl ? "rtl" : "ltr";
    document.documentElement.dir = newDir;
    document.documentElement.lang = isRtl ? "he" : "en";
  }, [languageId, languages, mounted]);

  const setLanguageId = useCallback((id: number) => {
    setLanguageIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_STORAGE_KEY, String(id));
    }
  }, []);

  const refreshLanguages = useCallback(async () => {
    await fetchLanguages();
  }, [fetchLanguages]);

  return (
    <LanguageContext.Provider value={{ languageId, dir, languages, mounted, setLanguageId, refreshLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}
