"use client";

import { useState, useEffect, useCallback } from "react";
import { ServiceOfficeModal } from "@/database/Service_Offices/ServiceOfficeModal";
import { ServiceOfficeCustomersModal } from "@/database/customer/ServiceOfficeCustomersModal";
import { ServiceOfficeSubcontractorsModal } from "@/database/subcontractors/ServiceOfficeSubcontractorsModal";
import { ServiceOfficeUsersModal } from "@/database/service_office_users/ServiceOfficeUsersModal";
import type { ServiceOffice, CreateServiceOfficeInput } from "@/database/Service_Offices/types";
import { COUNTRIES } from "@/database/Service_Offices/countries";
import { useTranslations } from "@/app/context/TranslationContext";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

function getCountryLabel(code: string | null): string {
  if (!code) return "—";
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? `${c.flag} ${c.name}` : code;
}

const defaultForm: CreateServiceOfficeInput & { status: number } = {
  service_office_name: "",
  service_office_description: null,
  account_id: 0,
  country: null,
  status: 1,
};

interface AccountServiceOfficesModalProps {
  isOpen: boolean;
  account: { account_id: number; account_name: string } | null;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

export function AccountServiceOfficesModal({
  isOpen,
  account,
  onClose,
  onNotify,
}: AccountServiceOfficesModalProps) {
  const { t } = useTranslations();
  const [offices, setOffices] = useState<ServiceOffice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<ServiceOffice | null>(null);
  const [form, setForm] = useState<CreateServiceOfficeInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customersOffice, setCustomersOffice] = useState<{ service_office_id: number; service_office_name: string } | null>(null);
  const [subcontractorsOffice, setSubcontractorsOffice] = useState<{ service_office_id: number; service_office_name: string } | null>(null);
  const [usersOffice, setUsersOffice] = useState<{ service_office_id: number; service_office_name: string } | null>(null);

  const fetchOffices = useCallback(async () => {
    if (!account || !isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/service-offices?account_id=${account.account_id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOffices(Array.isArray(data) ? data : []);
    } catch {
      setOffices([]);
      onNotify("Failed to load service offices", "error");
    } finally {
      setIsLoading(false);
    }
  }, [account?.account_id, isOpen, onNotify]);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingOffice(null);
    setForm({
      ...defaultForm,
      account_id: account?.account_id ?? 0,
    });
  };

  const openAddForm = () => {
    setEditingOffice(null);
    setForm({
      ...defaultForm,
      account_id: account?.account_id ?? 0,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (office: ServiceOffice) => {
    setEditingOffice(office);
    setForm({
      service_office_name: office.service_office_name,
      service_office_description: office.service_office_description ?? null,
      account_id: office.account_id,
      country: office.country ?? null,
      status: office.status,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.service_office_name?.trim() || !account) return;
    const effectiveAccountId = form.account_id || account.account_id;
    if (effectiveAccountId < 1) return;
    setIsSaving(true);
    try {
      if (editingOffice) {
        const res = await fetch(`/api/service-offices/${editingOffice.service_office_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_office_name: form.service_office_name,
            service_office_description: form.service_office_description,
            country: form.country,
            status: form.status,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setOffices((prev) =>
          prev.map((o) => (o.service_office_id === updated.service_office_id ? updated : o))
        );
        onNotify(`"${updated.service_office_name}" updated`, "update");
      } else {
        const res = await fetch("/api/service-offices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            account_id: effectiveAccountId,
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setOffices((prev) => [created, ...prev]);
        onNotify(`"${created.service_office_name}" created`, "create");
      }
      resetForm();
    } catch {
      onNotify("Operation failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (officeId: number) => {
    try {
      const res = await fetch(`/api/service-offices/${officeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const office = offices.find((o) => o.service_office_id === officeId);
      setOffices((prev) => prev.filter((o) => o.service_office_id !== officeId));
      setDeleteConfirm(null);
      onNotify(`"${office?.service_office_name ?? "Service office"}" deleted`, "delete");
    } catch {
      onNotify("Delete failed", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-4xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t("Service Offices")} — {account?.account_name ?? ""}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("Add, edit, or remove service offices for this account")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAddForm();
                }}
                disabled={!account}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14"/>
                  <path d="M12 5v14"/>
                </svg>
                {t("Add Service Office")}
              </button>
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

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 lg:px-6 py-12 text-center">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Loading...</p>
                    </td>
                  </tr>
                ) : offices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 lg:px-6 py-12 text-center text-slate-500 text-sm">
                      No service offices. Click &quot;Add Service Office&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  offices.map((office) => (
                    <tr key={office.service_office_id} className="hover:bg-slate-50/50">
                      <td className="px-4 lg:px-6 py-3 font-medium text-slate-900">{office.service_office_name}</td>
                      <td className="px-4 lg:px-6 py-3 hidden sm:table-cell text-sm text-slate-600 truncate max-w-[180px]">
                        {office.service_office_description || "—"}
                      </td>
                      <td className="px-4 lg:px-6 py-3 text-sm">{getCountryLabel(office.country)}</td>
                      <td className="px-4 lg:px-6 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            office.status === 1 ? "bg-emerald-50 text-emerald-700" : office.status === 2 ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {STATUS_LABELS[office.status] ?? "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setCustomersOffice({
                                service_office_id: office.service_office_id,
                                service_office_name: office.service_office_name,
                              })
                            }
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title="Manage customers"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 19h6"/>
                              <path d="M19 16v6"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M3 21v-2a6 6 0 0 1 6-6h2"/>
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              setSubcontractorsOffice({
                                service_office_id: office.service_office_id,
                                service_office_name: office.service_office_name,
                              })
                            }
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title={t("Manage subcontractors")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 20h16"/>
                              <path d="M6 20V8l6-4 6 4v12"/>
                              <path d="M9 12h6"/>
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              setUsersOffice({
                                service_office_id: office.service_office_id,
                                service_office_name: office.service_office_name,
                              })
                            }
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title="Manage users"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditForm(office)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                          {deleteConfirm === office.service_office_id ? (
                            <>
                              <button onClick={() => handleDelete(office.service_office_id)} className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200">Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(office.service_office_id)}
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
          </div>
        </div>
      </div>

      <ServiceOfficeModal
        isOpen={isFormOpen}
        editingOffice={editingOffice}
        form={form}
        accounts={account ? [account] : []}
        isSaving={isSaving}
        onClose={resetForm}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
        fixedAccountId={account?.account_id ?? null}
        fixedAccountName={account?.account_name}
      />

      <ServiceOfficeCustomersModal
        isOpen={customersOffice != null}
        serviceOffice={customersOffice}
        onClose={() => setCustomersOffice(null)}
        onNotify={onNotify}
      />

      <ServiceOfficeSubcontractorsModal
        isOpen={subcontractorsOffice != null}
        serviceOffice={subcontractorsOffice}
        onClose={() => setSubcontractorsOffice(null)}
        onNotify={onNotify}
      />

      <ServiceOfficeUsersModal
        isOpen={usersOffice != null}
        serviceOffice={usersOffice}
        onClose={() => setUsersOffice(null)}
        onNotify={onNotify}
      />
    </>
  );
}
