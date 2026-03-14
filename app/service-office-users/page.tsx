"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { ServiceOfficeUserModal } from "@/database/service_office_users/ServiceOfficeUserModal";
import { AssignCustomersProjectsWizard } from "@/database/service_office_users/AssignCustomersProjectsWizard";
import type {
  CreateServiceOfficeUserInput,
  ServiceOfficeUser,
  ServiceOfficeUserFormState,
} from "@/database/service_office_users/types";
import type { ServiceOffice } from "@/database/Service_Offices/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const defaultForm: CreateServiceOfficeUserInput & { status: number } = {
  user_name: "",
  user_type: 0,
  user_professional_grade: 0,
  service_office_id: 0,
  subcontractor_id: null,
  mobile_phone: "",
  secondary_phone: null,
  email_address: "",
  status: 1,
};

function ServiceOfficeUsersContent() {
  const searchParams = useSearchParams();
  const fixedServiceOfficeIdParam = searchParams.get("service_office_id");
  const fixedServiceOfficeId = fixedServiceOfficeIdParam ? parseInt(fixedServiceOfficeIdParam, 10) : null;

  const [serviceOffices, setServiceOffices] = useState<ServiceOffice[]>([]);
  const [subcontractors, setSubcontractors] = useState<{ subcontractor_id: number; subcontractor_name: string }[]>([]);
  const [selectedServiceOfficeId, setSelectedServiceOfficeId] = useState<number | "">("");
  const [users, setUsers] = useState<ServiceOfficeUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ServiceOfficeUser | null>(null);
  const [form, setForm] = useState<ServiceOfficeUserFormState>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [assignWizardUser, setAssignWizardUser] = useState<ServiceOfficeUser | null>(null);
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { notifications, dismissNotification, notifyCreate, notifyUpdate, notifyDelete, notifyError } =
    useNotifications();

  const fetchServiceOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/service-offices");
      if (!res.ok) throw new Error("Failed to fetch service offices");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setServiceOffices(list);

      if (fixedServiceOfficeId && !isNaN(fixedServiceOfficeId)) {
        setSelectedServiceOfficeId(fixedServiceOfficeId);
      } else if (list.length > 0 && selectedServiceOfficeId === "") {
        setSelectedServiceOfficeId(list[0].service_office_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch service offices");
      setServiceOffices([]);
    } finally {
      setIsLoadingOffices(false);
    }
  }, [fixedServiceOfficeId, selectedServiceOfficeId]);

  const fetchUsers = useCallback(async () => {
    if (selectedServiceOfficeId === "") {
      setUsers([]);
      setIsLoadingUsers(false);
      return;
    }
    setIsLoadingUsers(true);
    try {
      setError(null);
      const res = await fetch(`/api/service-office-users?service_office_id=${selectedServiceOfficeId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch users");
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [selectedServiceOfficeId]);

  const fetchSubcontractors = useCallback(async () => {
    if (selectedServiceOfficeId === "") {
      setSubcontractors([]);
      return;
    }
    try {
      const res = await fetch(`/api/subcontractors?service_office_id=${selectedServiceOfficeId}`);
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
  }, [selectedServiceOfficeId]);

  useEffect(() => {
    fetchServiceOffices();
  }, [fetchServiceOffices]);

  useEffect(() => {
    fetchUsers();
    fetchSubcontractors();
  }, [fetchUsers, fetchSubcontractors]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
    });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: ServiceOfficeUser) => {
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
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.user_name?.trim() || !form.mobile_phone?.trim() || !form.email_address?.trim()) return;
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
        notifyUpdate(`"${updated.user_name}" updated`);
      } else {
        const res = await fetch("/api/service-office-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            user_professional_grade: form.user_professional_grade!,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setUsers((prev) => [created, ...prev]);
        notifyCreate(`"${created.user_name}" created`);
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const res = await fetch(`/api/service-office-users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const u = users.find((x) => x.service_office_user_id === userId);
      setUsers((prev) => prev.filter((x) => x.service_office_user_id !== userId));
      setDeleteConfirm(null);
      notifyDelete(`"${u?.user_name ?? "User"}" deleted`);
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
              <span className="text-slate-700 font-medium">Service Office Users</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">Service Office Users</h1>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">By service office</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a service office to view and manage users
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedServiceOfficeId === "" ? "" : selectedServiceOfficeId}
                    onChange={(e) => setSelectedServiceOfficeId(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 min-w-[220px]"
                    disabled={isLoadingOffices || !!fixedServiceOfficeId}
                  >
                    <option value="">Select service office</option>
                    {serviceOffices.map((s) => (
                      <option key={s.service_office_id} value={s.service_office_id}>
                        {s.service_office_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={openCreateModal}
                    disabled={!selectedServiceOfficeId || isLoadingOffices}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    Add User
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Email</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Mobile</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingUsers ? (
                    <tr><td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">Loading users...</td></tr>
                  ) : selectedServiceOfficeId === "" ? (
                    <tr><td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">Select a service office to view users</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">No users yet. Add one for this service office.</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.service_office_user_id} className="hover:bg-slate-50/50">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">{user.user_name}</td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-slate-600">{user.email_address}</td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-sm text-slate-600">{user.mobile_phone}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-700">{STATUS_LABELS[user.status] ?? "Unknown"}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setAssignWizardUser(user)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              title="Assign Customers & Projects"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                <path d="M12 11v6"/>
                                <path d="M9 14h6"/>
                              </svg>
                            </button>
                            <button onClick={() => openEditModal(user)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === user.service_office_user_id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(user.service_office_user_id)} className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600">Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(user.service_office_user_id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </main>

      <AssignCustomersProjectsWizard
        key={assignWizardUser?.service_office_user_id ?? "closed"}
        isOpen={!!assignWizardUser}
        serviceOfficeId={assignWizardUser ? assignWizardUser.service_office_id : 0}
        serviceOfficeUserId={assignWizardUser?.service_office_user_id ?? 0}
        userName={assignWizardUser?.user_name ?? ""}
        onClose={() => setAssignWizardUser(null)}
        onSaved={() => notifyUpdate("Assignments updated")}
      />

      <ServiceOfficeUserModal
        isOpen={isModalOpen}
        editingUser={editingUser}
        form={form}
        serviceOffices={serviceOffices.map((s) => ({
          service_office_id: s.service_office_id,
          service_office_name: s.service_office_name,
        }))}
        subcontractors={subcontractors}
        fixedServiceOfficeId={fixedServiceOfficeId ?? (selectedServiceOfficeId === "" ? null : selectedServiceOfficeId)}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
        onSubcontractorAdded={(sub) =>
          setSubcontractors((prev) =>
            prev.some((s) => s.subcontractor_id === sub.subcontractor_id) ? prev : [...prev, sub]
          )
        }
      />

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function ServiceOfficeUsersPage() {
  return (
    <SidebarProvider>
      <ServiceOfficeUsersContent />
    </SidebarProvider>
  );
}
