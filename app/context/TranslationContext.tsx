"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";

interface TranslationContextType {
  dictionary: Record<string, string>;
  loadingTranslations: boolean;
  t: (sourceText: string) => string;
  refreshTranslations: () => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType>({
  dictionary: {},
  loadingTranslations: false,
  t: (sourceText: string) => sourceText,
  refreshTranslations: async () => {},
});

export function useTranslations() {
  return useContext(TranslationContext);
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { languageId, mounted } = useLanguage();
  const [dictionary, setDictionary] = useState<Record<string, string>>({});
  const [loadingTranslations, setLoadingTranslations] = useState(false);

  const fetchTranslations = useCallback(async () => {
    setLoadingTranslations(true);
    try {
      const res = await fetch(`/api/translations/public?languageId=${languageId}&_=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) {
        setDictionary({});
        return;
      }
      const data = await res.json();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setDictionary(data as Record<string, string>);
      } else {
        setDictionary({});
      }
    } catch {
      setDictionary({});
    } finally {
      setLoadingTranslations(false);
    }
  }, [languageId]);

  useEffect(() => {
    if (!mounted) return;
    fetchTranslations();
  }, [fetchTranslations, mounted]);

  const t = useCallback(
    (sourceText: string) => {
      if (!sourceText) return sourceText;
      return dictionary[sourceText] ?? sourceText;
    },
    [dictionary]
  );

  const value = useMemo(
    () => ({
      dictionary,
      loadingTranslations,
      t,
      refreshTranslations: fetchTranslations,
    }),
    [dictionary, loadingTranslations, t, fetchTranslations]
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}
