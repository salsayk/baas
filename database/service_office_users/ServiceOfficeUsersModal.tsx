"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "@/app/context/TranslationContext";
import { ServiceOfficeUserModal } from "@/database/service_office_users/ServiceOfficeUserModal";
import type {
  CreateServiceOfficeUserInput,
  ServiceOfficeUser,
} from "@/database/service_office_users/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const defaultForm: CreateServiceOfficeUserInput & { status: number } = {
  user_name: "",
  // Sentinel value "not selected yet" (matches ServiceOfficeUserModal placeholder).
  user_type: -1,
  user_professional_grade: 0,
  service_office_id: 0,
  subcontractor_id: null,
  mobile_phone: "",
  secondary_phone: null,
  email_address: "",
  status: 1,
};

interface ServiceOfficeUsersModalProps {
  isOpen: boolean;
  serviceOffice: { service_office_id: number; service_office_name: string } | null;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

export function ServiceOfficeUsersModal({
  isOpen,
  serviceOffice,
  onClose,
  onNotify,
}: ServiceOfficeUsersModalProps) {
  const { t } = useTranslations();
  const [users, setUsers] = useState<ServiceOfficeUser[]>([]);
  const [subcontractors, setSubcontractors] = useState<{ subcontractor_id: number; subcontractor_name: string }[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ServiceOfficeUser | null>(null);
  const [form, setForm] = useState<CreateServiceOfficeUserInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!serviceOffice || !isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/service-office-users?service_office_id=${serviceOffice.service_office_id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
      onNotify("Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
  }, [serviceOffice?.service_office_id, isOpen, onNotify]);

  const fetchSubcontractors = useCallback(async () => {
    if (!serviceOffice || !isOpen) return;
    try {
      const res = await fetch(`/api/subcontractors?service_office_id=${serviceOffice.service_office_id}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSubcontractors(
        list.map((s: { subcontractor_id: number; subcontractor_name: string }) => ({
          subcontractor_id: s.subcontractor_id,
          subcontractor_name: s.subcontractor_name,
        }))
      );
    } catch {
      setSubcontractors([]);
    }
  }, [serviceOffice?.service_office_id, isOpen]);

  useEffect(() => {
    fetchUsers();
    fetchSubcontractors();
  }, [fetchUsers, fetchSubcontractors]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setForm({
      ...defaultForm,
      service_office_id: serviceOffice?.service_office_id ?? 0,
    });
  };

  const openAddForm = () => {
    setEditingUser(null);
    setForm({
      ...defaultForm,
      service_office_id: serviceOffice?.service_office_id ?? 0,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (user: ServiceOfficeUser) => {
    setEditingUser(user);
    setForm({
      user_name: user.user_name,
      user_type: user.user_type,
      user_professional_grade: user.user_professional_grade,
      service_office_id: user.service_office_id,
      subcontractor_id: user.subcontractor_id,
      mobile_phone: user.mobile_phone,
      secondary_phone: user.secondary_phone,
      email_address: user.email_address,
      status: user.status,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (
      !serviceOffice ||
      !form.user_name?.trim() ||
      !form.mobile_phone?.trim() ||
      !form.email_address?.trim() ||
      form.user_type === -1
    )
      return;
    setIsSaving(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/service-office-users/${editingUser.service_office_user_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_name: form.user_name,
            user_type: form.user_type,
            user_professional_grade: form.user_professional_grade!,
            subcontractor_id: form.subcontractor_id,
            mobile_phone: form.mobile_phone,
            secondary_phone: form.secondary_phone,
            email_address: form.email_address,
            status: form.status,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.service_office_user_id === updated.service_office_user_id ? updated : u))
        );
        onNotify(`"${updated.user_name}" updated`, "update");
      } else {
        const res = await fetch("/api/service-office-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            service_office_id: serviceOffice.service_office_id,
            user_professional_grade: form.user_professional_grade!,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setUsers((prev) => [created, ...prev]);
        onNotify(`"${created.user_name}" created`, "create");
      }
      resetForm();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Operation failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const res = await fetch(`/api/service-office-users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const u = users.find((x) => x.service_office_user_id === userId);
      setUsers((prev) => prev.filter((x) => x.service_office_user_id !== userId));
      setDeleteConfirm(null);
      onNotify(`"${u?.user_name ?? "User"}" deleted`, "delete");
    } catch {
      onNotify("Delete failed", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-5xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t("Service Office Users")} — {serviceOffice?.service_office_name ?? ""}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{t("Manage users for this service office")}</p>
              <div className="mt-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Service Office
                </label>
                <select
                  value={serviceOffice?.service_office_id ?? ""}
                  disabled
                  className="w-full sm:w-[320px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                >
                  {serviceOffice ? (
                    <option value={serviceOffice.service_office_id}>{serviceOffice.service_office_name}</option>
                  ) : (
                    <option value="">Select service office</option>
                  )}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openAddForm}
                disabled={!serviceOffice}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                Add User
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Email</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Mobile</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 lg:px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 lg:px-6 py-12 text-center text-slate-500">No users yet. Click &quot;Add User&quot;.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.service_office_user_id} className="hover:bg-slate-50/50">
                      <td className="px-4 lg:px-6 py-3 font-medium text-slate-900">{user.user_name}</td>
                      <td className="px-4 lg:px-6 py-3 hidden md:table-cell text-sm text-slate-600">{user.email_address}</td>
                      <td className="px-4 lg:px-6 py-3 hidden sm:table-cell text-sm text-slate-600">{user.mobile_phone}</td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-slate-700">{STATUS_LABELS[user.status] ?? "Unknown"}</td>
                      <td className="px-4 lg:px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditForm(user)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                          {deleteConfirm === user.service_office_user_id ? (
                            <>
                              <button onClick={() => handleDelete(user.service_office_user_id)} className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200">Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirm(user.service_office_user_id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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

      <ServiceOfficeUserModal
        isOpen={isFormOpen}
        editingUser={editingUser}
        form={form}
        serviceOffices={
          serviceOffice
            ? [{ service_office_id: serviceOffice.service_office_id, service_office_name: serviceOffice.service_office_name }]
            : []
        }
        subcontractors={subcontractors}
        fixedServiceOfficeId={serviceOffice?.service_office_id ?? null}
        isSaving={isSaving}
        onClose={resetForm}
        onSave={handleSave}
        onChange={(updates) =>
          setForm((prev) => ({
            ...prev,
            ...updates,
            user_professional_grade:
              updates.user_professional_grade == null ? prev.user_professional_grade : updates.user_professional_grade,
          }))
        }
        onSubcontractorAdded={(sub) =>
          setSubcontractors((prev) =>
            prev.some((s) => s.subcontractor_id === sub.subcontractor_id) ? prev : [...prev, sub]
          )
        }
      />
    </>
  );
}
