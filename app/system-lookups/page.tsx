"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { useLanguage } from "@/app/context/LanguageContext";
import { SystemLookupModal } from "@/database/system_lookups/SystemLookupModal";
import { LookupValuesModal } from "@/database/system_lookup_values/LookupValuesModal";
import type { SystemLookup, CreateSystemLookupInput } from "@/database/system_lookups/types";

const defaultForm: CreateSystemLookupInput = {
  lookup_table_name: "",
  lookup_table_description: null,
};

function SystemLookupsContent() {
  const [lookups, setLookups] = useState<SystemLookup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<SystemLookup | null>(null);
  const [form, setForm] = useState<CreateSystemLookupInput>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [manageLookup, setManageLookup] = useState<{
    lookup_table_id: number;
    lookup_table_name: string;
  } | null>(null);
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
  const { languageId } = useLanguage();

  const fetchLookups = useCallback(async () => {
    try {
      setError(null);
      const url = `/api/system-lookups${languageId ? `?language_id=${languageId}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setLookups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lookups");
      setLookups([]);
    } finally {
      setIsLoading(false);
    }
  }, [languageId]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingLookup(null);
    setForm(defaultForm);
  };

  const openCreateModal = () => {
    setEditingLookup(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (lookup: SystemLookup) => {
    setEditingLookup(lookup);
    setForm({
      lookup_table_name: lookup.lookup_table_name,
      lookup_table_description: lookup.lookup_table_description ?? null,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.lookup_table_name?.trim()) return;
    setIsSaving(true);
    try {
      if (editingLookup) {
        const res = await fetch(`/api/system-lookups/${editingLookup.lookup_table_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        const updatedId = Number(updated.lookup_table_id);
        setLookups((prev) =>
          prev.map((l) =>
            Number(l.lookup_table_id) === updatedId ? { ...l, ...updated, lookup_table_id: updatedId } : l
          )
        );
        if (manageLookup?.lookup_table_id === updatedId) {
          setManageLookup({ lookup_table_id: updatedId, lookup_table_name: updated.lookup_table_name });
        }
        notifyUpdate(`Lookup "${updated.lookup_table_name}" updated`);
        await fetchLookups();
      } else {
        const res = await fetch("/api/system-lookups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setLookups((prev) => [created, ...prev]);
        notifyCreate(`Lookup "${created.lookup_table_name}" created`);
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (lookupTableId: number) => {
    try {
      const res = await fetch(`/api/system-lookups/${lookupTableId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const lookup = lookups.find((l) => l.lookup_table_id === lookupTableId);
      setLookups((prev) => prev.filter((l) => l.lookup_table_id !== lookupTableId));
      setDeleteConfirm(null);
      if (manageLookup?.lookup_table_id === lookupTableId) {
        setManageLookup(null);
      }
      notifyDelete(`Lookup "${lookup?.lookup_table_name ?? "Unknown"}" deleted`);
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
              <span className="text-slate-700 font-medium">System Lookups</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">
            System Lookups
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
                    Lookup tables
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add, edit, or remove lookup tables and their values
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
                  Add lookup table
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
                          <p className="text-slate-500">Loading lookups...</p>
                        </div>
                      </td>
                    </tr>
                  ) : lookups.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                              <path d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">No lookup tables yet</p>
                            <p className="text-slate-500 text-sm mt-1">Create your first lookup table to get started</p>
                          </div>
                          <button
                            onClick={openCreateModal}
                            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                          >
                            Add lookup table
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lookups.map((lookup) => (
                      <tr key={lookup.lookup_table_id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <span className="font-medium text-slate-900">{lookup.lookup_table_name}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-sm text-slate-600 truncate max-w-[280px]">
                          {lookup.lookup_table_description || "—"}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setManageLookup({ lookup_table_id: lookup.lookup_table_id, lookup_table_name: lookup.lookup_table_name })}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Manage values"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 6h16M4 12h16M4 18h16"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(lookup)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === lookup.lookup_table_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(lookup.lookup_table_id)}
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
                                onClick={() => setDeleteConfirm(lookup.lookup_table_id)}
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

      <SystemLookupModal
        isOpen={isModalOpen}
        editingLookup={editingLookup}
        form={form}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <LookupValuesModal
        isOpen={manageLookup != null}
        lookup={manageLookup}
        languageId={languageId}
        onClose={() => setManageLookup(null)}
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

export default function SystemLookupsPage() {
  return (
    <SidebarProvider>
      <SystemLookupsContent />
    </SidebarProvider>
  );
}
