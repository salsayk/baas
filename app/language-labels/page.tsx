"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTranslations } from "@/app/context/TranslationContext";
import type { Language } from "@/database/Languages/types";

type Screen = { id: number; screen_name: string };

type Translation = {
  id: number;
  screen_id: number;
  screen_name: string;
  source_text: string;
  language_id: number;
  translated_text: string;
  language_name: string;
};

function LanguageLabelsContent() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | null>(null);
  const [selectedScreenId, setSelectedScreenId] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isLoadingScreens, setIsLoadingScreens] = useState(true);
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editedValues, setEditedValues] = useState<Record<number, string>>({});

  const {
    notifications,
    dismissNotification,
    notifyUpdate,
    notifyError,
  } = useNotifications();
  const { refreshLanguages } = useLanguage();
  const { refreshTranslations } = useTranslations();

  const fetchLanguages = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/languages");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setLanguages(list);
      if (list.length > 0 && !selectedLanguageId) {
        setSelectedLanguageId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch languages");
      setLanguages([]);
    } finally {
      setIsLoadingLanguages(false);
    }
  }, []);

  const fetchScreens = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/screens");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setScreens(list);
      if (list.length > 0 && !selectedScreenId) {
        setSelectedScreenId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch screens");
      setScreens([]);
    } finally {
      setIsLoadingScreens(false);
    }
  }, []);

  const fetchTranslations = useCallback(async (languageId: number, screenId: number) => {
    setIsLoadingTranslations(true);
    setError(null);
    try {
      const res = await fetch(`/api/translations?language_id=${languageId}&screen_id=${screenId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setTranslations(Array.isArray(data) ? data : []);
      setEditedValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch translations");
      setTranslations([]);
    } finally {
      setIsLoadingTranslations(false);
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    fetchScreens();
  }, [fetchScreens]);

  useEffect(() => {
    if (selectedLanguageId && selectedScreenId) {
      fetchTranslations(selectedLanguageId, selectedScreenId);
    } else {
      setTranslations([]);
    }
  }, [selectedLanguageId, selectedScreenId, fetchTranslations]);

  const handleTranslatedChange = (id: number, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveTranslation = async (id: number, translatedText: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/translations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translated_text: translatedText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      const updated = await res.json();
      setTranslations((prev) =>
        prev.map((t) => (t.id === id ? { ...t, translated_text: updated.translated_text } : t))
      );
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      notifyUpdate("Translation updated");
      refreshLanguages();
      refreshTranslations();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const handleBlur = (t: Translation) => {
    const value = editedValues[t.id] ?? t.translated_text;
    if (value.trim() !== t.translated_text) {
      handleSaveTranslation(t.id, value.trim() || t.translated_text);
    } else {
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, t: Translation) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  const selectedLanguage = languages.find((l) => l.id === selectedLanguageId);

  return (
    <div className="app-layout-with-sidebar min-h-screen bg-slate-50 flex flex-row">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Pages</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-slate-700 font-medium">Language Labels</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">
            Language Labels
          </h1>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">
                    Edit translations by language and screen
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a language and screen to view and edit labels. Changes save on blur.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 min-w-0">
                  <div className="flex items-center gap-3">
                    <label htmlFor="lang-select" className="text-sm font-medium text-slate-700 shrink-0">
                      Language
                    </label>
                    <select
                      id="lang-select"
                      value={selectedLanguageId ?? ""}
                      onChange={(e) => setSelectedLanguageId(e.target.value ? Number(e.target.value) : null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 min-w-[180px]"
                      disabled={isLoadingLanguages}
                    >
                      <option value="">Select language...</option>
                      {languages.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.language_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label htmlFor="screen-select" className="text-sm font-medium text-slate-700 shrink-0">
                      Screen
                    </label>
                    <select
                      id="screen-select"
                      value={selectedScreenId ?? ""}
                      onChange={(e) => setSelectedScreenId(e.target.value ? Number(e.target.value) : null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 min-w-[180px]"
                      disabled={isLoadingScreens}
                    >
                      <option value="">Select screen...</option>
                      {screens.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.screen_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Source Text</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Translated Text</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!selectedLanguageId || !selectedScreenId ? (
                    <tr>
                      <td colSpan={2} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        Select a language and screen to view and edit translations
                      </td>
                    </tr>
                  ) : isLoadingTranslations ? (
                    <tr>
                      <td colSpan={2} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                          <p className="text-slate-500">Loading translations...</p>
                        </div>
                      </td>
                    </tr>
                  ) : translations.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" x2="8" y1="13" y2="13"/>
                              <line x1="16" x2="8" y1="17" y2="17"/>
                              <line x1="10" x2="8" y1="9" y2="9"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">No translations for {selectedLanguage?.language_name ?? "this language"}</p>
                            <p className="text-slate-500 text-sm mt-1">Add labels in the languages_screens_translations table for this language</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    translations.map((t) => (
                      <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 lg:px-6 py-3 align-top">
                          <span className="text-slate-700 font-medium">{t.source_text}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedValues[t.id] ?? t.translated_text}
                              onChange={(e) => handleTranslatedChange(t.id, e.target.value)}
                              onBlur={() => handleBlur(t)}
                              onKeyDown={(e) => handleKeyDown(e, t)}
                              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                              placeholder="Translated text"
                              disabled={savingId === t.id}
                            />
                            {savingId === t.id && (
                              <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin flex-shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function LanguageLabelsPage() {
  return (
    <SidebarProvider>
      <LanguageLabelsContent />
    </SidebarProvider>
  );
}
