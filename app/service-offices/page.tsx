"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "@/app/context/TranslationContext";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { ServiceOfficeModal } from "@/database/Service_Offices/ServiceOfficeModal";
import { ServiceOfficeCustomersModal } from "@/database/customer/ServiceOfficeCustomersModal";
import { ServiceOfficeSubcontractorsModal } from "@/database/subcontractors/ServiceOfficeSubcontractorsModal";
import { ServiceOfficeUsersModal } from "@/database/service_office_users/ServiceOfficeUsersModal";
import type { ServiceOffice, CreateServiceOfficeInput } from "@/database/Service_Offices/types";
import { COUNTRIES } from "@/database/Service_Offices/countries";

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

interface AccountOption {
  account_id: number;
  account_name: string;
}

interface SubscriptionOfferOption {
  subscription_offer_id: number;
  subscription_offer_name: string;
  status: number;
}

const defaultForm: CreateServiceOfficeInput & { status: number } = {
  service_office_name: "",
  service_office_description: null,
  account_id: 0,
  subscription_offer_id: 0,
  country: null,
  status: 1,
};

function ServiceOfficesContent() {
  const { t, refreshTranslations } = useTranslations();
  useEffect(() => {
    refreshTranslations();
  }, [refreshTranslations]);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [subscriptionOffers, setSubscriptionOffers] = useState<SubscriptionOfferOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "">("");
  const [offices, setOffices] = useState<ServiceOffice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<ServiceOffice | null>(null);
  const [customersOffice, setCustomersOffice] = useState<{ service_office_id: number; service_office_name: string } | null>(null);
  const [subcontractorsOffice, setSubcontractorsOffice] = useState<{ service_office_id: number; service_office_name: string } | null>(null);
  const [usersOffice, setUsersOffice] = useState<{ service_office_id: number; service_office_name: string } | null>(null);
  const [form, setForm] = useState<CreateServiceOfficeInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
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

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedAccountId((prev) => (prev === "" ? data[0].account_id : prev));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts");
      setAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  const fetchOffices = useCallback(async () => {
    if (selectedAccountId === "") {
      setOffices([]);
      setIsLoadingOffices(false);
      return;
    }
    setIsLoadingOffices(true);
    try {
      setError(null);
      const url = `/api/service-offices?account_id=${selectedAccountId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setOffices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch service offices");
      setOffices([]);
    } finally {
      setIsLoadingOffices(false);
    }
  }, [selectedAccountId]);

  const fetchSubscriptionOffers = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions-offers");
      if (!res.ok) throw new Error("Failed to fetch subscription offers");
      const data = await res.json();
      const rows = Array.isArray(data) ? (data as SubscriptionOfferOption[]) : [];
      setSubscriptionOffers(rows.filter((r) => Number(r.status) === 1));
    } catch (err) {
      notifyError(err instanceof Error ? t(err.message) : t("Failed to fetch subscription offers"));
      setSubscriptionOffers([]);
    }
  }, [notifyError, t]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  useEffect(() => {
    fetchSubscriptionOffers();
  }, [fetchSubscriptionOffers]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingOffice(null);
    setForm({
      ...defaultForm,
      account_id: selectedAccountId || 0,
      subscription_offer_id: subscriptionOffers[0]?.subscription_offer_id ?? 0,
    });
  };

  const openCreateModal = () => {
    setEditingOffice(null);
    const aid = selectedAccountId !== "" ? selectedAccountId : (accounts[0]?.account_id ?? 0);
    setForm({
      ...defaultForm,
      account_id: aid,
      subscription_offer_id: subscriptionOffers[0]?.subscription_offer_id ?? 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (office: ServiceOffice) => {
    setEditingOffice(office);
    setForm({
      service_office_name: office.service_office_name,
      service_office_description: office.service_office_description ?? null,
      account_id: office.account_id,
      subscription_offer_id:
        Number(office.current_subscription_offer_id ?? 0) > 0
          ? Number(office.current_subscription_offer_id)
          : (subscriptionOffers[0]?.subscription_offer_id ?? 0),
      country: office.country ?? null,
      status: office.status,
    });
    setIsModalOpen(true);
  };

  const openCopyModal = (office: ServiceOffice) => {
    setEditingOffice(null);
    setForm({
      service_office_name: "copy of " + (office.service_office_name ?? ""),
      service_office_description: office.service_office_description ?? null,
      account_id: office.account_id,
      subscription_offer_id: subscriptionOffers[0]?.subscription_offer_id ?? 0,
      country: office.country ?? null,
      status: office.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.service_office_name?.trim() || !form.account_id) return;
    if (!editingOffice && (!form.subscription_offer_id || form.subscription_offer_id < 1)) {
      notifyError(t("Subscription offer is required"));
      return;
    }
    setIsSaving(true);
    try {
      if (editingOffice) {
        const res = await fetch(`/api/service-offices/${editingOffice.service_office_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_office_name: form.service_office_name,
            service_office_description: form.service_office_description,
            subscription_offer_id: form.subscription_offer_id,
            country: form.country,
            status: form.status,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        const updatedId = Number(updated.service_office_id);
        setOffices((prev) =>
          prev.map((o) => (Number(o.service_office_id) === updatedId ? { ...o, ...updated, service_office_id: updatedId } : o))
        );
        notifyUpdate(`"${updated.service_office_name}" updated`);
        await fetchOffices();
      } else {
        const res = await fetch("/api/service-offices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            subscription_offer_id: form.subscription_offer_id,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setOffices((prev) => [created, ...prev]);
        notifyCreate(`"${created.service_office_name}" created`);
        await fetchOffices();
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (officeId: number) => {
    try {
      const res = await fetch(`/api/service-offices/${officeId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const office = offices.find((o) => o.service_office_id === officeId);
      setOffices((prev) => prev.filter((o) => o.service_office_id !== officeId));
      setDeleteConfirm(null);
      notifyDelete(`"${office?.service_office_name ?? "Service office"}" deleted`);
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
              <span className="text-slate-700 font-medium">Service Offices</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">
            Service Offices
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">By account</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select an account to view and manage its service offices
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedAccountId === "" ? "" : selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 min-w-[200px]"
                    disabled={isLoadingAccounts}
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.account_id} value={a.account_id}>
                        {a.account_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={openCreateModal}
                    disabled={!selectedAccountId || isLoadingAccounts}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14"/>
                      <path d="M12 5v14"/>
                    </svg>
                    Add Service Office
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Description</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingOffices ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                          <p className="text-slate-500">Loading service offices...</p>
                        </div>
                      </td>
                    </tr>
                  ) : !selectedAccountId ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        Select an account to view service offices
                      </td>
                    </tr>
                  ) : offices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                              <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                              <path d="M9 22v-4h6v4"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">No service offices yet</p>
                            <p className="text-slate-500 text-sm mt-1">Add one for this account</p>
                          </div>
                          <button
                            onClick={openCreateModal}
                            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                          >
                            Add Service Office
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    offices.map((office) => (
                      <tr key={office.service_office_id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <span className="font-medium text-slate-900">{office.service_office_name}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-slate-600 truncate max-w-[200px]">
                          {office.service_office_description || "—"}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm">
                          {getCountryLabel(office.country)}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                              office.status === 1
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : office.status === 2
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            {STATUS_LABELS[office.status] ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                setCustomersOffice({
                                  service_office_id: office.service_office_id,
                                  service_office_name: office.service_office_name,
                                })
                              }
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Manage customers"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Manage subcontractors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title={t("Manage users")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => openCopyModal(office)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copy"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(office)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === office.service_office_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(office.service_office_id)}
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
                                onClick={() => setDeleteConfirm(office.service_office_id)}
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

      <ServiceOfficeModal
        isOpen={isModalOpen}
        editingOffice={editingOffice}
        form={form}
        accounts={accounts}
        subscriptionOffers={subscriptionOffers}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <ServiceOfficeCustomersModal
        isOpen={customersOffice != null}
        serviceOffice={customersOffice}
        onClose={() => setCustomersOffice(null)}
        onNotify={(message, type) => {
          if (type === "create") notifyCreate(message);
          else if (type === "update") notifyUpdate(message);
          else if (type === "delete") notifyDelete(message);
          else notifyError(message);
        }}
      />

      <ServiceOfficeSubcontractorsModal
        isOpen={subcontractorsOffice != null}
        serviceOffice={subcontractorsOffice}
        onClose={() => setSubcontractorsOffice(null)}
        onNotify={(message, type) => {
          if (type === "create") notifyCreate(message);
          else if (type === "update") notifyUpdate(message);
          else if (type === "delete") notifyDelete(message);
          else notifyError(message);
        }}
      />

      <ServiceOfficeUsersModal
        isOpen={usersOffice != null}
        serviceOffice={usersOffice}
        onClose={() => setUsersOffice(null)}
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

export default function ServiceOfficesPage() {
  return (
    <SidebarProvider>
      <ServiceOfficesContent />
    </SidebarProvider>
  );
}
