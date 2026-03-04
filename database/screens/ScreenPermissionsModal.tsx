"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/app/context/LanguageContext";

const USER_TYPE_LOOKUP_ID = 2;
const PERMISSION_LOOKUP_ID = 5;

interface LookupValue {
  id: number;
  lookup_table_id: number;
  value_id: number;
  value_name: string;
}

interface PermissionRow {
  screen_id: number;
  user_type: number;
  permission: number;
  user_type_name: string;
  permission_name: string;
}

interface ScreenPermissionsModalProps {
  isOpen: boolean;
  screen: { screen_id: number; screen_name: string } | null;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

export function ScreenPermissionsModal({
  isOpen,
  screen,
  onClose,
  onNotify,
}: ScreenPermissionsModalProps) {
  const { languageId } = useLanguage();
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [userTypes, setUserTypes] = useState<LookupValue[]>([]);
  const [permissionValues, setPermissionValues] = useState<LookupValue[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<number | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!screen || !isOpen) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ screen_id: String(screen.screen_id) });
      if (languageId) params.set("language_id", String(languageId));
      const res = await fetch("/api/ui-screen-usertype-permissions?" + params);
      if (!res.ok) throw new Error("Failed to fetch permissions");
      const data = await res.json();
      setPermissions(Array.isArray(data) ? data : []);
    } catch {
      setPermissions([]);
      onNotify("Failed to load permissions", "error");
    } finally {
      setIsLoading(false);
    }
  }, [screen?.screen_id, isOpen, languageId, onNotify]);

  const fetchLookupValues = useCallback(async () => {
    if (!isOpen) return;
    try {
      const [userRes, permRes] = await Promise.all([
        fetch("/api/system-lookup-values?lookup_table_id=" + USER_TYPE_LOOKUP_ID + (languageId ? "&language_id=" + languageId : "")),
        fetch("/api/system-lookup-values?lookup_table_id=" + PERMISSION_LOOKUP_ID + (languageId ? "&language_id=" + languageId : "")),
      ]);
      const userData = userRes.ok ? await userRes.json() : [];
      const permData = permRes.ok ? await permRes.json() : [];
      setUserTypes(Array.isArray(userData) ? userData : []);
      setPermissionValues(Array.isArray(permData) ? permData : []);
    } catch {
      setUserTypes([]);
      setPermissionValues([]);
    }
  }, [isOpen, languageId]);

  useEffect(() => {
    if (isOpen && screen) {
      fetchPermissions();
      fetchLookupValues();
    }
  }, [isOpen, screen, fetchPermissions, fetchLookupValues]);

  const existingUserTypes = new Set(permissions.map((p) => p.user_type));

  const canAdd = screen &&
    selectedUserType !== null &&
    selectedPermission !== null &&
    !existingUserTypes.has(selectedUserType);

  const handleAdd = async () => {
    if (!screen || selectedUserType === null || selectedPermission === null || !canAdd) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/ui-screen-usertype-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screen_id: screen.screen_id,
          user_type: selectedUserType,
          permission: selectedPermission,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add permission");
      }
      await fetchPermissions();
      const userTypeName = userTypes.find((u) => u.value_id === selectedUserType)?.value_name ?? String(selectedUserType);
      const permName = permissionValues.find((p) => p.value_id === selectedPermission)?.value_name ?? String(selectedPermission);
      onNotify(`Added ${userTypeName} / ${permName}`, "create");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Add failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row: PermissionRow) => {
    if (!screen) return;
    const key = row.screen_id + "-" + row.user_type;
    setDeletingKey(key);
    try {
      const res = await fetch(
        "/api/ui-screen-usertype-permissions?screen_id=" + row.screen_id + "&user_type=" + row.user_type,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      await fetchPermissions();
      onNotify("Permission removed", "delete");
    } catch {
      onNotify("Delete failed", "error");
    } finally {
      setDeletingKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Manage Permissions</h2>
          <p className="mt-1 text-sm text-slate-500">
            {screen
              ? "Permissions for \"" + screen.screen_name + "\""
              : "Select a screen from the table first"}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {!screen ? (
            <p className="text-slate-500 text-sm">Select a screen to manage its permissions.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1">User Type</label>
                  <select
                    value={selectedUserType ?? ""}
                    onChange={(e) => setSelectedUserType(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm"
                  >
                    <option value="">Select user type</option>
                    {userTypes.map((v) => (
                      <option key={v.id} value={v.value_id}>{v.value_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Permission</label>
                  <select
                    value={selectedPermission ?? ""}
                    onChange={(e) => setSelectedPermission(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm"
                  >
                    <option value="">Select permission</option>
                    {permissionValues.map((v) => (
                      <option key={v.id} value={v.value_id}>{v.value_name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!canAdd || isSaving}
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700"
                >
                  {isSaving ? "Adding…" : "Add"}
                </button>
              </div>

              {existingUserTypes.size > 0 && (
                <p className="text-xs text-slate-500">Each user type can only be added once per screen.</p>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Current Permissions</h3>
                  {isLoading ? (
                  <div className="py-8 text-center text-slate-500">Loading…</div>
                ) : permissions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 rounded-xl border border-dashed border-slate-200">
                    No permissions yet. Add one above.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Permission</th>
                          <th className="px-4 py-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {permissions.map((row) => {
                          const key = row.screen_id + "-" + row.user_type;
                          return (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-sm text-slate-900">{row.user_type_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.permission_name}</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  disabled={deletingKey === key}
                                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-50"
                                  title="Remove"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    <line x1="10" y1="11" x2="10" y2="17"/>
                                    <line x1="14" y1="11" x2="14" y2="17"/>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
