"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTranslations } from "@/app/context/TranslationContext";
import { ScreenModal } from "@/database/screens/ScreenModal";
import { ScreenTranslationsModal } from "@/database/screens/ScreenTranslationsModal";
import { ScreenPermissionsModal } from "@/database/screens/ScreenPermissionsModal";
import type { UiScreen, CreateUiScreenInput } from "@/database/screens/types";
import { resolveUiScreenDisplayDescription, resolveUiScreenDisplayName } from "@/database/screens/types";

const defaultForm: CreateUiScreenInput = {
  screen_name: "",
  screen_description: null,
};

function ScreensContent() {
  const [screens, setScreens] = useState<UiScreen[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<UiScreen | null>(null);
  const [form, setForm] = useState<CreateUiScreenInput>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [translationScreen, setTranslationScreen] = useState<UiScreen | null>(null);
  const [permissionsScreen, setPermissionsScreen] = useState<UiScreen | null>(null);
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

  const { languageId, mounted } = useLanguage();
  const screensFetchSeq = useRef(0);

  const fetchScreens = useCallback(async () => {
    if (!mounted) return;
    const seq = ++screensFetchSeq.current;
    try {
      setError(null);
      const params = new URLSearchParams();
      if (languageId != null && languageId >= 1) {
        params.set("language_id", String(languageId));
      }
      const q = params.toString();
      const res = await fetch(q ? `/api/ui-screens?${q}` : "/api/ui-screens", {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      if (seq !== screensFetchSeq.current) return;
      setScreens(Array.isArray(data) ? data : []);
    } catch (err) {
      if (seq !== screensFetchSeq.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch screens");
      setScreens([]);
    } finally {
      if (seq === screensFetchSeq.current) {
        setIsLoading(false);
      }
    }
  }, [languageId, mounted]);

  useEffect(() => {
    if (!mounted) return;
    setIsLoading(true);
    fetchScreens();
  }, [fetchScreens, mounted]);

  useEffect(() => {
    setTranslationScreen((prev) => {
      if (!prev) return prev;
      return screens.find((s) => s.screen_id === prev.screen_id) ?? prev;
    });
    setPermissionsScreen((prev) => {
      if (!prev) return prev;
      return screens.find((s) => s.screen_id === prev.screen_id) ?? prev;
    });
  }, [screens]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingScreen(null);
    setForm(defaultForm);
  };

  const openCreateModal = () => {
    setEditingScreen(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (screen: UiScreen) => {
    setEditingScreen(screen);
    setForm({
      screen_name: screen.screen_name,
      screen_description: screen.screen_description ?? null,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.screen_name?.trim()) return;
    setIsSaving(true);
    try {
      if (editingScreen) {
        const res = await fetch(`/api/ui-screens/${editingScreen.screen_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        const updatedId = Number(updated.screen_id);
        setScreens((prev) =>
          prev.map((s) => (Number(s.screen_id) === updatedId ? { ...s, ...updated, screen_id: updatedId } : s))
        );
        if (translationScreen?.screen_id === updatedId) {
          setTranslationScreen({ ...updated, screen_id: updatedId });
        }
        notifyUpdate(`Screen "${updated.screen_name}" updated`);
        await fetchScreens();
      } else {
        const res = await fetch("/api/ui-screens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setScreens((prev) => [created, ...prev]);
        notifyCreate(`Screen "${created.screen_name}" created`);
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (screenId: number) => {
    try {
      const res = await fetch(`/api/ui-screens/${screenId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const screen = screens.find((s) => s.screen_id === screenId);
      setScreens((prev) => prev.filter((s) => s.screen_id !== screenId));
      setDeleteConfirm(null);
      if (translationScreen?.screen_id === screenId) {
        setTranslationScreen(null);
      }
      notifyDelete(`Screen "${screen?.screen_name ?? "Unknown"}" deleted`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    }
  };

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
              <span className="text-slate-700 font-medium">Screens</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">
            Screens
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
                    UI Screens
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add, edit, or remove screens and their translations
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
                  Add Screen
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                          <p className="text-slate-500">Loading screens...</p>
                        </div>
                      </td>
                    </tr>
                  ) : screens.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                              <rect x="3" y="3" width="7" height="7" rx="1"/>
                              <rect x="14" y="3" width="7" height="7" rx="1"/>
                              <rect x="3" y="14" width="7" height="7" rx="1"/>
                              <rect x="14" y="14" width="7" height="7" rx="1"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">No screens yet</p>
                            <p className="text-slate-500 text-sm mt-1">Create your first screen to get started</p>
                          </div>
                          <button
                            onClick={openCreateModal}
                            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                          >
                            Add Screen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    screens.map((screen) => (
                      <tr key={screen.screen_id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <span className="font-medium text-slate-900">
                            {resolveUiScreenDisplayName(screen)}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-sm text-slate-600 truncate max-w-[280px]">
                          {resolveUiScreenDisplayDescription(screen) || "—"}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPermissionsScreen(screen)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Manage permissions"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setTranslationScreen(screen)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Manage translations"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="2" y1="12" x2="22" y2="12"/>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(screen)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === screen.screen_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(screen.screen_id)}
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
                                onClick={() => setDeleteConfirm(screen.screen_id)}
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

      <ScreenModal
        isOpen={isModalOpen}
        editingScreen={editingScreen}
        form={form}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <ScreenTranslationsModal
        isOpen={translationScreen != null}
        screen={translationScreen}
        onClose={() => setTranslationScreen(null)}
        onNotify={(message, type) => {
          if (type === "create") notifyCreate(message);
          else if (type === "update") notifyUpdate(message);
          else if (type === "delete") notifyDelete(message);
          else notifyError(message);
        }}
      />

      <ScreenPermissionsModal
        isOpen={permissionsScreen != null}
        screen={permissionsScreen}
        onClose={() => setPermissionsScreen(null)}
        onNotify={(message, type) => {
          if (type === "create") notifyCreate(message);
          else if (type === "update") notifyUpdate(message);
          else if (type === "delete") notifyDelete(message);
          else notifyError(message);
        }}
      />

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function ScreensPage() {
  return (
    <SidebarProvider>
      <ScreensContent />
    </SidebarProvider>
  );
}
