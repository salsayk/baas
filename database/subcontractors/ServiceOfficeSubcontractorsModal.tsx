"use client";

import { useCallback, useEffect, useState } from "react";
import { SubcontractorModal } from "@/database/subcontractors/SubcontractorModal";
import type { CreateSubcontractorInput, Subcontractor } from "@/database/subcontractors/types";

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

interface ServiceOfficeSubcontractorsModalProps {
  isOpen: boolean;
  serviceOffice: { service_office_id: number; service_office_name: string } | null;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

export function ServiceOfficeSubcontractorsModal({
  isOpen,
  serviceOffice,
  onClose,
  onNotify,
}: ServiceOfficeSubcontractorsModalProps) {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [form, setForm] = useState<CreateSubcontractorInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubcontractors = useCallback(async () => {
    if (!serviceOffice || !isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/subcontractors?service_office_id=${serviceOffice.service_office_id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSubcontractors(Array.isArray(data) ? data : []);
    } catch {
      setSubcontractors([]);
      onNotify("Failed to load subcontractors", "error");
    } finally {
      setIsLoading(false);
    }
  }, [serviceOffice?.service_office_id, isOpen, onNotify]);

  useEffect(() => {
    fetchSubcontractors();
  }, [fetchSubcontractors]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingSubcontractor(null);
    setForm({
      ...defaultForm,
      service_office_id: serviceOffice?.service_office_id ?? 0,
    });
  };

  const openAddForm = () => {
    setEditingSubcontractor(null);
    setForm({
      ...defaultForm,
      service_office_id: serviceOffice?.service_office_id ?? 0,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (subcontractor: Subcontractor) => {
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
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!serviceOffice || !form.subcontractor_name?.trim()) return;
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
        setSubcontractors((prev) =>
          prev.map((s) => (s.subcontractor_id === updated.subcontractor_id ? updated : s))
        );
        onNotify(`"${updated.subcontractor_name}" updated`, "update");
      } else {
        const res = await fetch("/api/subcontractors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            service_office_id: serviceOffice.service_office_id,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setSubcontractors((prev) => [created, ...prev]);
        onNotify(`"${created.subcontractor_name}" created`, "create");
      }
      resetForm();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Operation failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subcontractorId: number) => {
    try {
      const res = await fetch(`/api/subcontractors/${subcontractorId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const subcontractor = subcontractors.find((s) => s.subcontractor_id === subcontractorId);
      setSubcontractors((prev) => prev.filter((s) => s.subcontractor_id !== subcontractorId));
      setDeleteConfirm(null);
      onNotify(`"${subcontractor?.subcontractor_name ?? "Subcontractor"}" deleted`, "delete");
    } catch {
      onNotify("Delete failed", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Subcontractors — {serviceOffice?.service_office_name ?? ""}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Manage subcontractors for this service office</p>
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
                Add Subcontractor
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
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Contact Person</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Phone</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 lg:px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                ) : subcontractors.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 lg:px-6 py-12 text-center text-slate-500">No subcontractors yet. Click "Add Subcontractor".</td></tr>
                ) : (
                  subcontractors.map((subcontractor) => (
                    <tr key={subcontractor.subcontractor_id} className="hover:bg-slate-50/50">
                      <td className="px-4 lg:px-6 py-3 font-medium text-slate-900">{subcontractor.subcontractor_name}</td>
                      <td className="px-4 lg:px-6 py-3 hidden md:table-cell text-sm text-slate-600">{subcontractor.contact_person_name || "—"}</td>
                      <td className="px-4 lg:px-6 py-3 hidden sm:table-cell text-sm text-slate-600">{subcontractor.contact_person_phone || "—"}</td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-slate-700">{STATUS_LABELS[subcontractor.status] ?? "Unknown"}</td>
                      <td className="px-4 lg:px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditForm(subcontractor)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                          {deleteConfirm === subcontractor.subcontractor_id ? (
                            <>
                              <button onClick={() => handleDelete(subcontractor.subcontractor_id)} className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200">Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirm(subcontractor.subcontractor_id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete">
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

      <SubcontractorModal
        isOpen={isFormOpen}
        editingSubcontractor={editingSubcontractor}
        form={form}
        serviceOffices={
          serviceOffice
            ? [{ service_office_id: serviceOffice.service_office_id, service_office_name: serviceOffice.service_office_name }]
            : []
        }
        fixedServiceOfficeId={serviceOffice?.service_office_id ?? null}
        isSaving={isSaving}
        onClose={resetForm}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />
    </>
  );
}
