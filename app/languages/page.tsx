"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { LanguageModal } from "@/database/Languages/LanguageModal";
import { useLanguage } from "@/app/context/LanguageContext";
import type { Language, CreateLanguageInput } from "@/database/Languages/types";

const DIRECTION_LABELS: Record<number, string> = {
  0: "LTR (Left-to-Right)",
  1: "RTL (Right-to-Left)",
};

const defaultForm: CreateLanguageInput = {
  language_name: "",
  direction: 0,
};

function LanguagesContent() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [form, setForm] = useState<CreateLanguageInput>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    notifications,
    dismissNotification,
    notifyCreate,
    notifyUpdate,
    notifyDelete,
    notifyError,
  } = useNotifications();

  const { refreshLanguages } = useLanguage();

  const fetchLanguages = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/languages");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setLanguages(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch languages");
      setLanguages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingLanguage(null);
    setForm(defaultForm);
  };

  const openCreateModal = () => {
    setEditingLanguage(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (language: Language) => {
    setEditingLanguage(language);
    setForm({
      language_name: language.language_name,
      direction: language.direction,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.language_name?.trim()) return;
    setIsSaving(true);
    try {
      if (editingLanguage) {
        const res = await fetch(`/api/languages/${editingLanguage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        const updatedId = Number(updated.id);
        setLanguages((prev) =>
          prev.map((l) => (Number(l.id) === updatedId ? { ...l, ...updated, id: updatedId } : l))
        );
        notifyUpdate(`Language "${updated.language_name}" updated`);
        refreshLanguages();
      } else {
        const res = await fetch("/api/languages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setLanguages((prev) => [...prev, created]);
        notifyCreate(`Language "${created.language_name}" created`);
        refreshLanguages();
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (languageId: number) => {
    try {
      const res = await fetch(`/api/languages/${languageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const language = languages.find((l) => l.id === languageId);
      setLanguages((prev) => prev.filter((l) => l.id !== languageId));
      setDeleteConfirm(null);
      notifyDelete(`Language "${language?.language_name ?? "Unknown"}" deleted`);
      refreshLanguages();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const isProtectedLanguage = (id: number) => id === 1 || id === 2;

  return (
    <div className="app-layout-with-sidebar min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-row">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Pages</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-slate-700 font-medium">Languages</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">
            Languages
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

          <div className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">
                    Available Languages
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage application languages and text directions
                  </p>
                </div>
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"/>
                    <path d="M12 5v14"/>
                  </svg>
                  Add Language
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Language Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Direction</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                          <p className="text-slate-500">Loading languages...</p>
                        </div>
                      </td>
                    </tr>
                  ) : languages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                              <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">No languages yet</p>
                            <p className="text-slate-500 text-sm mt-1">Add your first language to get started</p>
                          </div>
                          <button
                            onClick={openCreateModal}
                            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                          >
                            Add Language
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    languages.map((language) => (
                      <tr key={language.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <span className="text-slate-500 font-mono text-sm">{language.id}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className="font-medium text-slate-900">{language.language_name}</span>
                          {isProtectedLanguage(language.id) && (
                            <span className="ms-2 inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                              language.direction === 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-violet-50 text-violet-700 border border-violet-200"
                            }`}
                          >
                            {DIRECTION_LABELS[language.direction]}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(language)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {isProtectedLanguage(language.id) ? (
                              <button
                                disabled
                                className="p-2 rounded-lg text-slate-300 cursor-not-allowed"
                                title="Cannot delete default language"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                              </button>
                            ) : deleteConfirm === language.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(language.id)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(language.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                              </button>
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

      <LanguageModal
        isOpen={isModalOpen}
        editingLanguage={editingLanguage}
        form={form}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function LanguagesPage() {
  return (
    <SidebarProvider>
      <LanguagesContent />
    </SidebarProvider>
  );
}
