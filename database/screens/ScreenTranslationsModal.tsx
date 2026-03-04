"use client";

import { useState, useEffect, useCallback } from "react";

interface Language {
  id: number;
  language_name: string;
  direction?: number;
}

interface ScreenTranslationsModalProps {
  isOpen: boolean;
  screen: { screen_id: number; screen_name: string; screen_description?: string | null } | null;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

export function ScreenTranslationsModal({
  isOpen,
  screen,
  onClose,
  onNotify,
}: ScreenTranslationsModalProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch("/api/languages");
      if (!res.ok) return;
      const data = await res.json();
      setLanguages(Array.isArray(data) ? data : []);
    } catch {
      setLanguages([]);
    }
  }, []);

  const fetchTranslation = useCallback(async () => {
    if (!screen || !languageId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        "/api/ui-screen-translations?screen_id=" + screen.screen_id + "&language_id=" + languageId
      );
      if (!res.ok) {
        setName(screen.screen_name ?? "");
        setDescription(screen.screen_description ?? "");
        return;
      }
      const data = await res.json();
      if (data) {
        setName(data.name ?? screen.screen_name ?? "");
        setDescription(data.description ?? screen.screen_description ?? "");
      } else {
        setName(screen.screen_name ?? "");
        setDescription(screen.screen_description ?? "");
      }
    } catch {
      setName(screen.screen_name ?? "");
      setDescription(screen.screen_description ?? "");
    } finally {
      setIsLoading(false);
    }
  }, [screen?.screen_id, screen?.screen_name, screen?.screen_description, languageId]);

  useEffect(() => {
    if (isOpen) fetchLanguages();
  }, [isOpen, fetchLanguages]);

  useEffect(() => {
    if (isOpen && screen && languageId) {
      fetchTranslation();
    } else if (isOpen && screen && !languageId) {
      setName(screen.screen_name ?? "");
      setDescription(screen.screen_description ?? "");
    }
  }, [isOpen, screen, languageId, fetchTranslation]);

  const handleSave = async () => {
    if (!screen || !languageId || !name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/ui-screen-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screen_id: screen.screen_id,
          language_id: languageId,
          name: name.trim(),
          description: description?.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save translation");
      }
      onNotify("Translation for " + screen.screen_name + " saved", "update");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setLanguageId(null);
    setName("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900">Add / Edit Translation</h2>
          <p className="mt-1 text-sm text-slate-500">
            {screen
              ? "Translate screen \"" + screen.screen_name + "\" into another language"
              : "Select a screen from the table first"}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="translation-language" className="block text-sm font-medium text-slate-700 mb-2">
              Language
            </label>
            <select
              id="translation-language"
              value={languageId ?? ""}
              onChange={(e) => setLanguageId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              disabled={!screen || isSaving}
            >
              <option value="">Select language</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.language_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="translation-name" className="block text-sm font-medium text-slate-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="translation-name"
              type="text"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={screen?.screen_name ?? "Translated name"}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              disabled={!screen || !languageId || isLoading || isSaving}
            />
          </div>

          <div>
            <label htmlFor="translation-description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <input
              id="translation-description"
              type="text"
              maxLength={250}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={screen?.screen_description ?? "Optional translated description"}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              disabled={!screen || !languageId || isLoading || isSaving}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!screen || !languageId || !name.trim() || isLoading || isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Save Translation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
