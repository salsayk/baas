"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/app/context/TranslationContext";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { SubcontractorModal } from "@/database/subcontractors/SubcontractorModal";
import type { CreateSubcontractorInput, Subcontractor } from "@/database/subcontractors/types";
import type { ServiceOffice } from "@/database/Service_Offices/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const defaultForm: CreateSubcontractorInput & { status: number } = {
  subcontractor_name: "",
  service_office_id: 0,
  status: 1,
  contact_person_name: null,
  contact_person_phone: null,
  contact_person_email: null,
  contact_person_address: null,
};

function SubcontractorsContent() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const fixedServiceOfficeIdParam = searchParams.get("service_office_id");
  const fixedServiceOfficeId = fixedServiceOfficeIdParam ? parseInt(fixedServiceOfficeIdParam, 10) : null;

  const [serviceOffices, setServiceOffices] = useState<ServiceOffice[]>([]);
  const [selectedServiceOfficeId, setSelectedServiceOfficeId] = useState<number | "">("");
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [form, setForm] = useState<CreateSubcontractorInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
  const [isLoadingSubcontractors, setIsLoadingSubcontractors] = useState(true);
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

  const fetchSubcontractors = useCallback(async () => {
    if (selectedServiceOfficeId === "") {
      setSubcontractors([]);
      setIsLoadingSubcontractors(false);
      return;
    }
    setIsLoadingSubcontractors(true);
    try {
      setError(null);
      const res = await fetch(`/api/subcontractors?service_office_id=${selectedServiceOfficeId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch subcontractors");
      }
      const data = await res.json();
      setSubcontractors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subcontractors");
      setSubcontractors([]);
    } finally {
      setIsLoadingSubcontractors(false);
    }
  }, [selectedServiceOfficeId]);

  useEffect(() => {
    fetchServiceOffices();
  }, [fetchServiceOffices]);

  useEffect(() => {
    fetchSubcontractors();
  }, [fetchSubcontractors]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingSubcontractor(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
    });
  };

  const openCreateModal = () => {
    setEditingSubcontractor(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor);
    setForm({
      subcontractor_name: subcontractor.subcontractor_name,
      service_office_id: subcontractor.service_office_id,
      status: subcontractor.status,
      contact_person_name: subcontractor.contact_person_name,
      contact_person_phone: subcontractor.contact_person_phone,
      contact_person_email: subcontractor.contact_person_email,
      contact_person_address: subcontractor.contact_person_address,
    });
    setIsModalOpen(true);
  };

  const openCopyModal = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(null);
    setForm({
      subcontractor_name: "copy of " + (subcontractor.subcontractor_name ?? ""),
      service_office_id: subcontractor.service_office_id,
      status: subcontractor.status,
      contact_person_name: subcontractor.contact_person_name,
      contact_person_phone: subcontractor.contact_person_phone,
      contact_person_email: subcontractor.contact_person_email,
      contact_person_address: subcontractor.contact_person_address,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.subcontractor_name?.trim() || !form.service_office_id) return;
    setIsSaving(true);
    try {
      if (editingSubcontractor) {
        const res = await fetch(`/api/subcontractors/${editingSubcontractor.subcontractor_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subcontractor_name: form.subcontractor_name,
            status: form.status,
            contact_person_name: form.contact_person_name,
            contact_person_phone: form.contact_person_phone,
            contact_person_email: form.contact_person_email,
            contact_person_address: form.contact_person_address,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        const updatedId = Number(updated.subcontractor_id);
        setSubcontractors((prev) =>
          prev.map((s) => (Number(s.subcontractor_id) === updatedId ? { ...s, ...updated, subcontractor_id: updatedId } : s))
        );
        notifyUpdate(`"${updated.subcontractor_name}" updated`);
        await fetchSubcontractors();
      } else {
        const res = await fetch("/api/subcontractors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setSubcontractors((prev) => [created, ...prev]);
        notifyCreate(`"${created.subcontractor_name}" created`);
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subcontractorId: number) => {
    try {
      const res = await fetch(`/api/subcontractors/${subcontractorId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const subcontractor = subcontractors.find((s) => s.subcontractor_id === subcontractorId);
      setSubcontractors((prev) => prev.filter((s) => s.subcontractor_id !== subcontractorId));
      setDeleteConfirm(null);
      notifyDelete(`"${subcontractor?.subcontractor_name ?? "Subcontractor"}" deleted`);
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
              <span className="text-slate-700 font-medium">Subcontractors</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">Subcontractors</h1>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">{t("By service office")}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("Select a service office to view and manage subcontractors")}
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
                    Add Subcontractor
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">{t("Contact Person")}</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">{t("Contact Phone")}</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingSubcontractors ? (
                    <tr><td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">Loading subcontractors...</td></tr>
                  ) : selectedServiceOfficeId === "" ? (
                    <tr><td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">Select a service office to view subcontractors</td></tr>
                  ) : subcontractors.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">No subcontractors yet. Add one for this service office.</td></tr>
                  ) : (
                    subcontractors.map((subcontractor) => (
                      <tr key={subcontractor.subcontractor_id} className="hover:bg-slate-50/50">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">{subcontractor.subcontractor_name}</td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-slate-600">{subcontractor.contact_person_name || "—"}</td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-sm text-slate-600">{subcontractor.contact_person_phone || "—"}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-700">{STATUS_LABELS[subcontractor.status] ?? "Unknown"}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openCopyModal(subcontractor)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Copy">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                            <button onClick={() => openEditModal(subcontractor)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === subcontractor.subcontractor_id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(subcontractor.subcontractor_id)} className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600">Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(subcontractor.subcontractor_id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete">
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

      <SubcontractorModal
        isOpen={isModalOpen}
        editingSubcontractor={editingSubcontractor}
        form={form}
        serviceOffices={serviceOffices.map((s) => ({
          service_office_id: s.service_office_id,
          service_office_name: s.service_office_name,
        }))}
        fixedServiceOfficeId={selectedServiceOfficeId === "" ? null : selectedServiceOfficeId}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function SubcontractorsPage() {
  return (
    <SidebarProvider>
      <SubcontractorsContent />
    </SidebarProvider>
  );
}
