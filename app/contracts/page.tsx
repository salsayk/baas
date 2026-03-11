"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { useTranslations } from "@/app/context/TranslationContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { ContractModal } from "@/database/contracts/ContractModal";
import type { Contract, CreateContractInput } from "@/database/contracts/types";
import type { ServiceOffice } from "@/database/Service_Offices/types";

const STATUS_KEYS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

function getDefaultForm(serviceOfficeId: number): CreateContractInput & { status: number } {
  const today = new Date().toISOString().slice(0, 10);
  return {
    contract_name: "",
    contract_description: null,
    service_office_id: serviceOfficeId,
    customer_id: 0,
    contract_type: 0,
    status: 1,
    contract_start_date: today,
    contract_optional_end_date: null,
    contract_amount_value: null,
    contract_currency: "ILS",
    pp_proforma_recurrence: 0,
    pp_proforma_occasion: "",
    pp_initial_payment_reached_indicator: 0,
    pp_initial_amount_value: 0,
    pp_upper_cap_reached_indicator: 0,
    pp_upper_cap_amount_value: 0,
    pp_recurrence_initial_payment_reached_indicator: 0,
    pp_recurrence_initial_amount_value: 0,
    pp_recurrence_upper_cap_reached_indicator: 0,
    pp_recurrence_upper_cap_amount_value: 0,
  };
}

function ContractsContent() {
  const searchParams = useSearchParams();
  const fixedServiceOfficeIdParam = searchParams.get("service_office_id");
  const fixedServiceOfficeId = fixedServiceOfficeIdParam ? parseInt(fixedServiceOfficeIdParam, 10) : null;

  const [serviceOffices, setServiceOffices] = useState<ServiceOffice[]>([]);
  const [selectedServiceOfficeId, setSelectedServiceOfficeId] = useState<number | "">("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<{ customer_id: number; customer_name: string }[]>([]);
  const [contractTypes, setContractTypes] = useState<{ value_id: number; value_name: string }[]>([]);
  const [ppProformaRecurrences, setPpProformaRecurrences] = useState<{ value_id: number; value_name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [form, setForm] = useState<CreateContractInput & { status: number }>(() =>
    getDefaultForm(0)
  );
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { t } = useTranslations();
  const { languageId } = useLanguage();
  const {
    notifications,
    dismissNotification,
    notifyCreate,
    notifyUpdate,
    notifyDelete,
    notifyError,
  } = useNotifications();

  const selectedOffice = useMemo(
    () => serviceOffices.find((s) => s.service_office_id === selectedServiceOfficeId) ?? null,
    [serviceOffices, selectedServiceOfficeId]
  );

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

  const fetchContracts = useCallback(async () => {
    if (selectedServiceOfficeId === "") {
      setContracts([]);
      setIsLoadingContracts(false);
      return;
    }
    setIsLoadingContracts(true);
    try {
      setError(null);
      const res = await fetch("/api/contracts?service_office_id=" + selectedServiceOfficeId);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch contracts");
      }
      const data = await res.json();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch contracts");
      setContracts([]);
    } finally {
      setIsLoadingContracts(false);
    }
  }, [selectedServiceOfficeId]);

  const fetchCustomers = useCallback(async () => {
    if (selectedServiceOfficeId === "") {
      setCustomers([]);
      return;
    }
    setIsLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers?service_office_id=" + selectedServiceOfficeId);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCustomers(list.map((c: { customer_id: number; customer_name: string }) => ({
        customer_id: c.customer_id,
        customer_name: c.customer_name,
      })));
    } catch {
      setCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [selectedServiceOfficeId]);

  const fetchLookups = useCallback(async () => {
    try {
      const lookupsRes = await fetch("/api/system-lookups");
      if (!lookupsRes.ok) return;
      const lookups = await lookupsRes.json();
      if (!Array.isArray(lookups)) return;

      const contractTypeLookup = lookups.find(
        (l: { lookup_table_name: string }) => l.lookup_table_name === "Contract Type"
      );
      const ppRecurrenceLookup = lookups.find(
        (l: { lookup_table_name: string }) => l.lookup_table_name === "PP Proforma Recurrence"
      );

      const langParam = languageId ? `&language_id=${languageId}` : "";
      const [ctRes, ppRes] = await Promise.all([
        contractTypeLookup
          ? fetch(`/api/system-lookup-values?lookup_table_id=${contractTypeLookup.lookup_table_id}${langParam}`)
          : Promise.resolve({ ok: false }),
        ppRecurrenceLookup
          ? fetch(`/api/system-lookup-values?lookup_table_id=${ppRecurrenceLookup.lookup_table_id}${langParam}`)
          : Promise.resolve({ ok: false }),
      ]);

      if (ctRes.ok) {
        const data = await ctRes.json();
        setContractTypes(Array.isArray(data) ? data : []);
      }
      if (ppRes.ok) {
        const data = await ppRes.json();
        setPpProformaRecurrences(Array.isArray(data) ? data : []);
      }
    } catch {
      setContractTypes([]);
      setPpProformaRecurrences([]);
    }
  }, [languageId]);

  useEffect(() => {
    fetchServiceOffices();
  }, [fetchServiceOffices]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingContract(null);
    setForm(
      getDefaultForm(selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId)
    );
  };

  const openCreateModal = () => {
    setEditingContract(null);
    setForm(
      getDefaultForm(selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId)
    );
    setIsModalOpen(true);
  };

  const openEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setForm({
      contract_name: contract.contract_name,
      contract_description: contract.contract_description,
      service_office_id: contract.service_office_id,
      customer_id: contract.customer_id,
      contract_type: contract.contract_type,
      status: contract.status,
      contract_start_date: contract.contract_start_date,
      contract_optional_end_date: contract.contract_optional_end_date,
      contract_amount_value: contract.contract_amount_value,
      contract_currency: contract.contract_currency,
      pp_proforma_recurrence: contract.pp_proforma_recurrence,
      pp_proforma_occasion: contract.pp_proforma_occasion,
      pp_initial_payment_reached_indicator: contract.pp_initial_payment_reached_indicator,
      pp_initial_amount_value: contract.pp_initial_amount_value,
      pp_upper_cap_reached_indicator: contract.pp_upper_cap_reached_indicator,
      pp_upper_cap_amount_value: contract.pp_upper_cap_amount_value,
      pp_recurrence_initial_payment_reached_indicator: contract.pp_recurrence_initial_payment_reached_indicator,
      pp_recurrence_initial_amount_value: contract.pp_recurrence_initial_amount_value,
      pp_recurrence_upper_cap_reached_indicator: contract.pp_recurrence_upper_cap_reached_indicator,
      pp_recurrence_upper_cap_amount_value: contract.pp_recurrence_upper_cap_amount_value,
    });
    setIsModalOpen(true);
  };

  const handleValidationError = (fieldId: string, message: string) => {
    notifyError(message);
  };

  const handleSave = async () => {
    if (!form.contract_name?.trim() || !form.service_office_id || !form.customer_id) return;
    setIsSaving(true);
    try {
      if (editingContract) {
        const res = await fetch("/api/contracts/" + editingContract.contract_id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract_name: form.contract_name,
            contract_description: form.contract_description,
            customer_id: form.customer_id,
            contract_type: form.contract_type,
            status: form.status,
            contract_start_date: form.contract_start_date,
            contract_optional_end_date: form.contract_optional_end_date,
            contract_amount_value: form.contract_amount_value,
            contract_currency: form.contract_currency,
            pp_proforma_recurrence: form.pp_proforma_recurrence,
            pp_proforma_occasion: form.pp_proforma_occasion,
            pp_initial_payment_reached_indicator: form.pp_initial_payment_reached_indicator,
            pp_initial_amount_value: form.pp_initial_amount_value,
            pp_upper_cap_reached_indicator: form.pp_upper_cap_reached_indicator,
            pp_upper_cap_amount_value: form.pp_upper_cap_amount_value,
            pp_recurrence_initial_payment_reached_indicator: form.pp_recurrence_initial_payment_reached_indicator,
            pp_recurrence_initial_amount_value: form.pp_recurrence_initial_amount_value,
            pp_recurrence_upper_cap_reached_indicator: form.pp_recurrence_upper_cap_reached_indicator,
            pp_recurrence_upper_cap_amount_value: form.pp_recurrence_upper_cap_amount_value,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update contract");
        }
        const updated = await res.json();
        setContracts((prev) =>
          prev.map((c) => (c.contract_id === updated.contract_id ? updated : c))
        );
        notifyUpdate(`"${updated.contract_name}" updated`);
      } else {
        const res = await fetch("/api/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            service_office_id: selectedServiceOfficeId || form.service_office_id,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create contract");
        }
        const created = await res.json();
        setContracts((prev) => [created, ...prev]);
        notifyCreate(`"${created.contract_name}" created`);
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contractId: number) => {
    try {
      const res = await fetch("/api/contracts/" + contractId, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete contract");
      }
      const contract = contracts.find((c) => c.contract_id === contractId);
      setContracts((prev) => prev.filter((c) => c.contract_id !== contractId));
      setDeleteConfirm(null);
      notifyDelete(`"${contract?.contract_name ?? "Contract"}" deleted`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="app-layout-with-sidebar min-h-screen bg-slate-50 flex flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Pages</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-slate-700 font-medium">{t("Contracts")}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">{t("Contracts")}</h1>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">{t("By service office")}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("Select a service office to view and manage its contracts")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedServiceOfficeId === "" ? "" : selectedServiceOfficeId}
                    onChange={(e) =>
                      setSelectedServiceOfficeId(e.target.value ? parseInt(e.target.value, 10) : "")
                    }
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 min-w-[220px]"
                    disabled={isLoadingOffices || !!fixedServiceOfficeId}
                  >
                    <option value="">{t("Select service office")}</option>
                    {serviceOffices.map((s) => (
                      <option key={s.service_office_id} value={s.service_office_id}>
                        {s.service_office_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={openCreateModal}
                    disabled={!selectedServiceOfficeId || isLoadingOffices || isLoadingCustomers}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    {t("Add Contract")}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("Contract Name")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">
                      {t("Customer")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">
                      {t("Start Date")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("Status")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">
                      {t("Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingContracts ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        Loading contracts...
                      </td>
                    </tr>
                  ) : selectedServiceOfficeId === "" ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        Select a service office to view contracts
                      </td>
                    </tr>
                  ) : contracts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        No contracts yet. Add one for this service office.
                      </td>
                    </tr>
                  ) : (
                    contracts.map((contract) => (
                      <tr key={contract.contract_id} className="hover:bg-slate-50/50">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">
                          {contract.contract_name}
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-slate-600">
                          {(contract as Contract & { customer_name?: string }).customer_name ??
                            customers.find((c) => c.customer_id === contract.customer_id)?.customer_name ??
                            contract.customer_id}
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-sm text-slate-600">
                          {contract.contract_start_date}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-700">
                          {t(STATUS_KEYS[contract.status] ?? "Unknown")}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(contract)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              title={t("Edit")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === contract.contract_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(contract.contract_id)}
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
                                onClick={() => setDeleteConfirm(contract.contract_id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                                title={t("Delete")}
                              >
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

      <ContractModal
        isOpen={isModalOpen}
        editingContract={editingContract}
        form={form}
        customers={customers}
        contractTypes={contractTypes}
        ppProformaRecurrences={ppProformaRecurrences}
        isSaving={isSaving}
        serviceOfficeId={selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
        onValidationError={handleValidationError}
        t={t}
      />

      <NotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
}

export default function ContractsPage() {
  return (
    <SidebarProvider>
      <ContractsContent />
    </SidebarProvider>
  );
}
