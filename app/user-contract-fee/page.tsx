"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CreateContractUserFeeInput, ContractUserFee } from "@/database/contract_user_fee/types";
import { ContractUserFeeModal } from "@/database/contract_user_fee/ContractUserFeeModal";
import type { Contract } from "@/database/contracts/types";
import type { ServiceOffice } from "@/database/Service_Offices/types";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { useTranslations } from "@/app/context/TranslationContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";

interface CustomerOption {
  customer_id: number;
  customer_name: string;
}

interface ContractOption {
  contract_id: number;
  contract_name: string;
}

interface LookupValue {
  value_id: number;
  /** Localized label when language_id was used in the API request */
  value_name: string;
  /** Canonical name from system_lookup_values (not the translation) */
  base_value_name?: string;
}

const defaultForm: CreateContractUserFeeInput = {
  contract_id: 0,
  user_professional_grade: null,
  user_hourly_rate: null,
  user_hourly_rate_discount: null,
};

function normalizeProfessionalGradeRows(rows: LookupValue[]): LookupValue[] {
  return rows.map((g) => ({
    ...g,
    value_id: Number(g.value_id),
  }));
}

function ContractUserFeeContent() {
  const { t, refreshTranslations } = useTranslations();
  const { notifications, dismissNotification, notifyCreate, notifyUpdate, notifyDelete, notifyError } = useNotifications();
  const { languageId } = useLanguage();
  const searchParams = useSearchParams();

  const preselectedServiceOfficeId = useMemo(() => {
    const raw = searchParams.get("service_office_id");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const preselectedCustomerId = useMemo(() => {
    const raw = searchParams.get("customer_id");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const preselectedContractId = useMemo(() => {
    const raw = searchParams.get("contract_id");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);
  const isEmbedded = searchParams.get("embed") === "1";

  const [serviceOffices, setServiceOffices] = useState<ServiceOffice[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [professionalGrades, setProfessionalGrades] = useState<LookupValue[]>([]);

  const [selectedServiceOfficeId, setSelectedServiceOfficeId] = useState<number | "">("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [selectedContractId, setSelectedContractId] = useState<number | "">("");

  const [fees, setFees] = useState<ContractUserFee[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ContractUserFee | null>(null);
  const [form, setForm] = useState<CreateContractUserFeeInput>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    refreshTranslations();
  }, [refreshTranslations]);

  const fetchProfessionalGrades = useCallback(async () => {
    try {
      const params = languageId ? `&language_id=${languageId}` : "";
      const res = await fetch(`/api/system-lookup-values?lookup_table_id=3${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setProfessionalGrades(Array.isArray(data) ? normalizeProfessionalGradeRows(data) : []);
    } catch {
      setProfessionalGrades([]);
    }
  }, [languageId]);

  const fetchServiceOffices = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/service-offices");
      if (!res.ok) throw new Error("Failed to fetch service offices");
      const data = await res.json();
      setServiceOffices(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch service offices";
      setError(t(msg));
      setServiceOffices([]);
    }
  }, [t]);

  const fetchCustomers = useCallback(async (serviceOfficeId: number) => {
    try {
      const res = await fetch(`/api/customers?service_office_id=${serviceOfficeId}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCustomers(
        list.map((c: CustomerOption) => ({
          customer_id: c.customer_id,
          customer_name: c.customer_name,
        }))
      );
    } catch {
      setCustomers([]);
    }
  }, [t]);

  const fetchContracts = useCallback(async (serviceOfficeId: number, customerId: number) => {
    try {
      const res = await fetch(`/api/contracts?service_office_id=${serviceOfficeId}&customer_id=${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch contracts");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setContracts(
        list.map((c: Contract & { contract_id: number }) => ({
          contract_id: Number(c.contract_id),
          contract_name: String(c.contract_name ?? ""),
        }))
      );
    } catch {
      setContracts([]);
    }
  }, [t]);

  const fetchFees = useCallback(async (contractId: number) => {
    setIsLoadingFees(true);
    try {
      const res = await fetch(`/api/contract-user-fee?contract_id=${contractId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch user contract fees");
      }
      const data = await res.json();
      setFees(Array.isArray(data) ? data : []);
    } catch (err) {
      setFees([]);
      const msg = err instanceof Error ? err.message : "Failed to fetch user contract fees";
      notifyError(t(msg));
    } finally {
      setIsLoadingFees(false);
    }
  }, [notifyError, t]);

  useEffect(() => {
    fetchServiceOffices();
    fetchProfessionalGrades();
  }, [fetchProfessionalGrades, fetchServiceOffices]);

  useEffect(() => {
    if (preselectedServiceOfficeId == null) return;
    if (selectedServiceOfficeId !== "") return;
    if (!serviceOffices.some((s) => Number(s.service_office_id) === preselectedServiceOfficeId)) return;
    setSelectedServiceOfficeId(preselectedServiceOfficeId);
  }, [preselectedServiceOfficeId, selectedServiceOfficeId, serviceOffices]);

  useEffect(() => {
    if (selectedServiceOfficeId === "") {
      setCustomers([]);
      setContracts([]);
      setSelectedCustomerId("");
      setSelectedContractId("");
      setFees([]);
      return;
    }
    fetchCustomers(selectedServiceOfficeId);
    setSelectedCustomerId("");
    setSelectedContractId("");
    setContracts([]);
    setFees([]);
  }, [fetchCustomers, selectedServiceOfficeId]);

  useEffect(() => {
    if (selectedServiceOfficeId === "" || selectedCustomerId === "") {
      setContracts([]);
      setSelectedContractId("");
      setFees([]);
      return;
    }
    fetchContracts(selectedServiceOfficeId, selectedCustomerId);
    setSelectedContractId("");
    setFees([]);
  }, [fetchContracts, selectedCustomerId, selectedServiceOfficeId]);

  useEffect(() => {
    if (preselectedCustomerId == null) return;
    if (selectedCustomerId !== "") return;
    if (selectedServiceOfficeId === "") return;
    if (!customers.some((c) => Number(c.customer_id) === preselectedCustomerId)) return;
    setSelectedCustomerId(preselectedCustomerId);
  }, [customers, preselectedCustomerId, selectedCustomerId, selectedServiceOfficeId]);

  useEffect(() => {
    if (preselectedContractId == null) return;
    if (selectedContractId !== "") return;
    if (selectedCustomerId === "" || selectedServiceOfficeId === "") return;
    if (!contracts.some((c) => Number(c.contract_id) === preselectedContractId)) return;
    setSelectedContractId(preselectedContractId);
  }, [contracts, preselectedContractId, selectedContractId, selectedCustomerId, selectedServiceOfficeId]);

  useEffect(() => {
    if (selectedContractId === "") {
      setFees([]);
      return;
    }
    fetchFees(selectedContractId);
  }, [fetchFees, selectedContractId]);

  const handleFormChange = useCallback((updates: Partial<CreateContractUserFeeInput>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingFee(null);
    setForm(defaultForm);
  };

  const openCreateModal = () => {
    if (selectedContractId === "") return;
    const used = new Set(fees.map((f) => Number(f.user_professional_grade)));
    const defaultGrade = professionalGrades.find((g) => !used.has(Number(g.value_id)))?.value_id ?? null;
    setEditingFee(null);
    setForm({
      ...defaultForm,
      contract_id: selectedContractId,
      user_professional_grade: defaultGrade,
      user_hourly_rate: 0,
      user_hourly_rate_discount: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (fee: ContractUserFee) => {
    setEditingFee(fee);
    setForm({
      contract_id: Number(fee.contract_id),
      user_professional_grade: Number(fee.user_professional_grade),
      user_hourly_rate: Number(fee.user_hourly_rate),
      user_hourly_rate_discount: Number(fee.user_hourly_rate_discount),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.contract_id || form.user_professional_grade == null) return;
    if (form.user_hourly_rate == null || form.user_hourly_rate_discount == null) return;

    setIsSaving(true);
    try {
      if (editingFee) {
        const res = await fetch(
          `/api/contract-user-fee/${editingFee.contract_id}/${editingFee.user_professional_grade}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_hourly_rate: form.user_hourly_rate,
              user_hourly_rate_discount: form.user_hourly_rate_discount,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = (await res.json()) as ContractUserFee;
        setFees((prev) =>
          prev.map((x) =>
            x.contract_id === updated.contract_id && x.user_professional_grade === updated.user_professional_grade
              ? updated
              : x
          )
        );
        notifyUpdate(`"${getGradeName(updated.user_professional_grade)}" ${t("Update")}`);
        setIsModalOpen(false);
      } else {
        const res = await fetch("/api/contract-user-fee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = (await res.json()) as ContractUserFee;
        setFees((prev) => [...prev, created]);
        notifyCreate(`"${getGradeName(created.user_professional_grade)}" ${t("Create")}`);
        setIsModalOpen(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      notifyError(t(msg));
    } finally {
      setIsSaving(false);
    }
  };

  const getGradeName = (gradeId: number | string) => {
    const id = Number(gradeId);
    const g = professionalGrades.find((x) => Number(x.value_id) === id);
    if (!g) return String(gradeId);
    // value_name is localized when professional grades are fetched with language_id
    return g.value_name ?? g.base_value_name ?? String(gradeId);
  };

  const handleDelete = async (fee: ContractUserFee) => {
    try {
      const res = await fetch(`/api/contract-user-fee/${fee.contract_id}/${fee.user_professional_grade}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      setFees((prev) => prev.filter((x) => !(x.contract_id === fee.contract_id && x.user_professional_grade === fee.user_professional_grade)));
      setDeleteConfirm(null);
      notifyDelete(`"${getGradeName(fee.user_professional_grade)}" ${t("Delete")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      notifyError(t(msg));
    }
  };

  return (
    <div className={`${isEmbedded ? "min-h-full" : "app-layout-with-sidebar min-h-screen"} bg-slate-50 dark:bg-slate-900 flex flex-row`}>
      {!isEmbedded && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0">
        {!isEmbedded && (
          <header className="h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <MobileMenuButton />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 hidden sm:inline">Pages</span>
                <span className="text-slate-300 hidden sm:inline">/</span>
                <span className="text-slate-700 font-medium">{t("User contract fee")}</span>
              </div>
            </div>
          </header>
        )}

        <div className={`flex-1 ${isEmbedded ? "p-3 sm:p-4" : "p-4 lg:p-8"} overflow-auto`}>
          {!isEmbedded && <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">{t("User contract fee")}</h1>}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {!isEmbedded && (
              <div className="p-4 lg:p-6 border-b border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t("Select service office")}</label>
                    <select
                      value={selectedServiceOfficeId === "" ? "" : selectedServiceOfficeId}
                      onChange={(e) => setSelectedServiceOfficeId(e.target.value ? parseInt(e.target.value, 10) : "")}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 w-full"
                      disabled={serviceOffices.length === 0}
                    >
                      <option value="">{t("Select service office")}</option>
                      {serviceOffices.map((s) => (
                        <option key={s.service_office_id} value={s.service_office_id}>
                          {s.service_office_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t("Select customer")}</label>
                    <select
                      value={selectedCustomerId === "" ? "" : selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value ? parseInt(e.target.value, 10) : "")}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 w-full"
                      disabled={selectedServiceOfficeId === ""}
                    >
                      <option value="">{t("Select customer")}</option>
                      {customers.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.customer_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{t("Select contract")}</label>
                    <select
                      value={selectedContractId === "" ? "" : selectedContractId}
                      onChange={(e) => setSelectedContractId(e.target.value ? parseInt(e.target.value, 10) : "")}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 w-full"
                      disabled={selectedCustomerId === ""}
                    >
                      <option value="">{t("Select contract")}</option>
                      {contracts.map((c) => (
                        <option key={c.contract_id} value={c.contract_id}>
                          {c.contract_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end mt-4">
                  <button
                    onClick={openCreateModal}
                    disabled={
                      selectedContractId === "" ||
                      isLoadingFees ||
                      professionalGrades.filter((g) => !fees.some((f) => Number(f.user_professional_grade) === Number(g.value_id))).length === 0
                    }
                    className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    {t("Add User Contract fee")}
                  </button>
                </div>
              </div>
            )}

            {isEmbedded && (
              <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-end">
                <button
                  onClick={openCreateModal}
                  disabled={
                    selectedContractId === "" ||
                    isLoadingFees ||
                    professionalGrades.filter((g) => !fees.some((f) => Number(f.user_professional_grade) === Number(g.value_id))).length === 0
                  }
                  className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                >
                  {t("Add User Contract fee")}
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("User Professional Grade")}</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("User hourly rate")}</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("User hourly rate discount")} %
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingFees ? (
                    <tr>
                      <td colSpan={4} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("Loading fees...")}
                      </td>
                    </tr>
                  ) : selectedContractId === "" ? (
                    <tr>
                      <td colSpan={4} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("Select a contract to view fees")}
                      </td>
                    </tr>
                  ) : fees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("No user contract fee entries yet for this contract.")}
                      </td>
                    </tr>
                  ) : (
                    fees.map((fee) => (
                      <tr key={`${fee.contract_id}-${fee.user_professional_grade}`} className="hover:bg-slate-50/50">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">{getGradeName(fee.user_professional_grade)}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600">{fee.user_hourly_rate}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600">{fee.user_hourly_rate_discount}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(fee)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              title={t("Edit")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </button>
                            {deleteConfirm === `${fee.contract_id}-${fee.user_professional_grade}` ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(fee)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600"
                                >
                                  {t("Confirm")}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600"
                                >
                                  {t("Cancel")}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(`${fee.contract_id}-${fee.user_professional_grade}`)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                                title={t("Delete")}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

      <ContractUserFeeModal
        isOpen={isModalOpen}
        editingFee={editingFee}
        form={form}
        usedProfessionalGrades={fees.map((f) => Number(f.user_professional_grade))}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={handleFormChange}
      />

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function UserContractFeePage() {
  return (
    <SidebarProvider>
      <ContractUserFeeContent />
    </SidebarProvider>
  );
}

