"use client";

import { useState, useEffect, useCallback } from "react";
import type { SystemLookupValue, CreateSystemLookupValueInput } from "@/database/system_lookup_values/types";

interface LookupValuesModalProps {
  isOpen: boolean;
  lookup: { lookup_table_id: number; lookup_table_name: string } | null;
  languageId?: number;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

const defaultValueForm = {
  value_id: 0,
  value_name: "",
};

export function LookupValuesModal({
  isOpen,
  lookup,
  languageId,
  onClose,
  onNotify,
}: LookupValuesModalProps) {
  const [values, setValues] = useState<SystemLookupValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<SystemLookupValue | null>(null);
  const [form, setForm] = useState(defaultValueForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"values" | "translations">("values");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translationLangId, setTranslationLangId] = useState<number | null>(null);
  const [lookupTranslation, setLookupTranslation] = useState<{ name: string; description: string }>({ name: "", description: "" });
  const [valueTranslations, setValueTranslations] = useState<Array<{ system_lookup_value_id: number; value_id: number; base_value_name: string; value_name: string }>>([]);
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);
  const [savingTranslationId, setSavingTranslationId] = useState<number | null>(null);

  const fetchValues = useCallback(async () => {
    if (!lookup || !isOpen) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ lookup_table_id: String(lookup.lookup_table_id) });
      if (languageId) params.set("language_id", String(languageId));
      const res = await fetch(`/api/system-lookup-values?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setValues(Array.isArray(data) ? data : []);
    } catch {
      setValues([]);
      onNotify("Failed to load values", "error");
    } finally {
      setIsLoading(false);
    }
  }, [lookup?.lookup_table_id, isOpen, languageId, onNotify]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/languages")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLanguages(Array.isArray(data) ? data : []))
      .catch(() => setLanguages([]));
  }, [isOpen]);

  const fetchTranslations = useCallback(async () => {
    if (!lookup || !translationLangId) return;
    setIsLoadingTranslations(true);
    try {
      const [lookupRes, valuesRes] = await Promise.all([
        fetch(`/api/system-lookup-translations?lookup_table_id=${lookup.lookup_table_id}&language_id=${translationLangId}`),
        fetch(`/api/system-lookup-value-translations?lookup_table_id=${lookup.lookup_table_id}&language_id=${translationLangId}`),
      ]);
      const lookupData = lookupRes.ok ? await lookupRes.json() : null;
      const valuesData = valuesRes.ok ? await valuesRes.json() : [];
      setLookupTranslation({
        name: lookupData?.name ?? lookup.lookup_table_name ?? "",
        description: lookupData?.description ?? "",
      });
      setValueTranslations(
        Array.isArray(valuesData)
          ? valuesData.map((v: { system_lookup_value_id: number; value_id: number; base_value_name: string; value_name: string }) => ({
              system_lookup_value_id: v.system_lookup_value_id,
              value_id: v.value_id,
              base_value_name: v.base_value_name ?? v.value_name,
              value_name: v.value_name,
            }))
          : []
      );
    } catch {
      setLookupTranslation({ name: lookup.lookup_table_name ?? "", description: "" });
      setValueTranslations([]);
    } finally {
      setIsLoadingTranslations(false);
    }
  }, [lookup?.lookup_table_id, lookup?.lookup_table_name, translationLangId]);

  useEffect(() => {
    if (activeTab === "translations" && translationLangId) {
      fetchTranslations();
    }
  }, [activeTab, translationLangId, fetchTranslations]);

  const saveLookupTranslation = async () => {
    if (!lookup || !translationLangId || !lookupTranslation.name.trim()) return;
    setSavingTranslationId(-1);
    try {
      const res = await fetch("/api/system-lookup-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookup_table_id: lookup.lookup_table_id,
          language_id: translationLangId,
          name: lookupTranslation.name.trim(),
          description: lookupTranslation.description?.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onNotify("Lookup translation saved", "update");
    } catch {
      onNotify("Failed to save lookup translation", "error");
    } finally {
      setSavingTranslationId(null);
    }
  };

  const saveValueTranslation = async (row: { system_lookup_value_id: number; value_name: string }) => {
    if (!translationLangId || !row.value_name.trim()) return;
    setSavingTranslationId(row.system_lookup_value_id);
    try {
      const res = await fetch("/api/system-lookup-value-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_lookup_value_id: row.system_lookup_value_id,
          language_id: translationLangId,
          value_name: row.value_name.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setValueTranslations((prev) =>
        prev.map((v) => (v.system_lookup_value_id === row.system_lookup_value_id ? { ...v, value_name: row.value_name.trim() } : v))
      );
      onNotify("Value translation saved", "update");
    } catch {
      onNotify("Failed to save value translation", "error");
    } finally {
      setSavingTranslationId(null);
    }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingValue(null);
    setForm(defaultValueForm);
  };

  const openAddForm = () => {
    setEditingValue(null);
    const nextId = values.length > 0
      ? Math.max(...values.map((v) => v.value_id), 0) + 1
      : 0;
    setForm({ value_id: nextId, value_name: "" });
    setIsFormOpen(true);
  };

  const openEditForm = (row: SystemLookupValue & { base_value_name?: string }) => {
    setEditingValue(row);
    setForm({
      value_id: row.value_id,
      value_name: row.base_value_name ?? row.value_name,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!lookup || !form.value_name?.trim()) return;
    const valueId = editingValue ? form.value_id : form.value_id;
    if (valueId < 0) return;
    setIsSaving(true);
    try {
      if (editingValue) {
        const res = await fetch(`/api/system-lookup-values/${editingValue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value_id: form.value_id, value_name: form.value_name.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        setValues((prev) =>
          prev.map((v) => (v.id === updated.id ? updated : v))
        );
        onNotify(`Value "${updated.value_name}" updated`, "update");
      } else {
        const res = await fetch("/api/system-lookup-values", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lookup_table_id: lookup.lookup_table_id,
            value_id: form.value_id,
            value_name: form.value_name.trim(),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setValues((prev) => [created, ...prev].sort((a, b) => a.value_id - b.value_id));
        onNotify(`Value "${created.value_name}" created`, "create");
      }
      resetForm();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Operation failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/system-lookup-values/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const row = values.find((v) => v.id === id);
      setValues((prev) => prev.filter((v) => v.id !== id));
      setDeleteConfirm(null);
      onNotify(`"${row?.value_name ?? "Value"}" deleted`, "delete");
    } catch {
      onNotify("Delete failed", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-2xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {lookup?.lookup_table_name ?? "Lookup"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === "values"
                  ? "Add, edit, or remove values for this lookup table"
                  : "Translate table name and values into another language"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "values" && (
                <button
                  onClick={openAddForm}
                  disabled={!lookup}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"/>
                    <path d="M12 5v14"/>
                  </svg>
                  Add Value
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 px-4 lg:px-6 flex gap-1">
            <button
              onClick={() => setActiveTab("values")}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "values"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Values
            </button>
            <button
              onClick={() => setActiveTab("translations")}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "translations"
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Translations
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === "values" ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Value ID</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Value name</th>
                  <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 lg:px-6 py-12 text-center">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Loading...</p>
                    </td>
                  </tr>
                ) : values.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 lg:px-6 py-12 text-center text-slate-500 text-sm">
                      No values. Click &quot;Add Value&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  values.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 lg:px-6 py-3 font-mono text-slate-700">{row.value_id}</td>
                      <td className="px-4 lg:px-6 py-3 font-medium text-slate-900">{row.value_name}</td>
                      <td className="px-4 lg:px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(row)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                          {deleteConfirm === row.id ? (
                            <>
                              <button onClick={() => handleDelete(row.id)} className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200">Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(row.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            ) : (
              <div className="p-4 lg:p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target language</label>
                  <select
                    value={translationLangId ?? ""}
                    onChange={(e) => setTranslationLangId(e.target.value ? Number(e.target.value) : null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm min-w-[180px]"
                  >
                    <option value="">Select language...</option>
                    {languages.map((lang) => (
                      <option key={lang.id} value={lang.id}>{lang.language_name}</option>
                    ))}
                  </select>
                </div>
                {translationLangId && (
                  <>
                    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Lookup table translation</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                          <input
                            type="text"
                            value={lookupTranslation.name}
                            onChange={(e) => setLookupTranslation((p) => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={lookupTranslation.description}
                            onChange={(e) => setLookupTranslation((p) => ({ ...p, description: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900"
                          />
                        </div>
                        <button
                          onClick={saveLookupTranslation}
                          disabled={!lookupTranslation.name.trim() || savingTranslationId === -1}
                          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {savingTranslationId === -1 ? "Saving…" : "Save lookup translation"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Value translations</h3>
                      {isLoadingTranslations ? (
                        <div className="py-12 text-center">
                          <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">Loading...</p>
                        </div>
                      ) : valueTranslations.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8">No values to translate. Add values in the Values tab first.</p>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="px-4 py-2 text-start text-xs font-semibold text-slate-500">Value ID</th>
                              <th className="px-4 py-2 text-start text-xs font-semibold text-slate-500">Base name</th>
                              <th className="px-4 py-2 text-start text-xs font-semibold text-slate-500">Translated name</th>
                              <th className="px-4 py-2 text-end text-xs font-semibold text-slate-500">Save</th>
                            </tr>
                          </thead>
                          <tbody>
                            {valueTranslations.map((row) => (
                              <tr key={row.system_lookup_value_id} className="border-b border-slate-100">
                                <td className="px-4 py-2 font-mono text-slate-600">{row.value_id}</td>
                                <td className="px-4 py-2 text-slate-600">{row.base_value_name}</td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={row.value_name}
                                    onChange={(e) =>
                                      setValueTranslations((prev) =>
                                        prev.map((v) =>
                                          v.system_lookup_value_id === row.system_lookup_value_id
                                            ? { ...v, value_name: e.target.value }
                                            : v
                                        )
                                      )}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900"
                                  />
                                </td>
                                <td className="px-4 py-2 text-end">
                                  <button
                                    onClick={() => saveValueTranslation(row)}
                                    disabled={savingTranslationId === row.system_lookup_value_id}
                                    className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 disabled:opacity-50"
                                  >
                                    {savingTranslationId === row.system_lookup_value_id ? "…" : "Save"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {isFormOpen && activeTab === "values" && (
            <div className="p-4 lg:p-6 border-t border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {editingValue ? "Edit value" : "New value"}
              </h3>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Value ID</label>
                  <input
                    type="number"
                    min={0}
                    value={form.value_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, value_id: parseInt(e.target.value, 10) || 0 }))}
                    disabled={!!editingValue}
                    className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Value name *</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.value_name}
                    onChange={(e) => setForm((f) => ({ ...f, value_name: e.target.value }))}
                    placeholder="Display name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!form.value_name?.trim() || isSaving}
                    className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium disabled:opacity-50 hover:bg-violet-700"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
