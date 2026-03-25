"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { CURRENCY_CODES } from "@/database/contracts/currencies";
import type { CreateContractInput, Contract } from "@/database/contracts/types";

const STATUS_KEYS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const CONTRACT_TYPES_AMOUNT_DISABLED = [2, 4];

interface LookupValue {
  value_id: number;
  value_name: string;
}

interface CustomerOption {
  customer_id: number;
  customer_name: string;
}

interface ContractModalProps {
  isOpen: boolean;
  editingContract: Contract | null;
  form: CreateContractInput & { status: number };
  customers: CustomerOption[];
  contractTypes: LookupValue[];
  ppProformaRecurrences: LookupValue[];
  ppProformaOccasions: LookupValue[];
  isSaving: boolean;
  serviceOfficeId: number;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateContractInput & { status: number }>) => void;
  onValidationError: (fieldId: string, message: string) => void;
  t: (sourceText: string) => string;
}

export function ContractModal({
  isOpen,
  editingContract,
  form,
  customers,
  contractTypes,
  ppProformaRecurrences,
  ppProformaOccasions,
  isSaving,
  serviceOfficeId,
  onClose,
  onSave,
  onChange,
  onValidationError,
  t,
}: ContractModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "pp">("details");
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>>({});

  const amountDisabled = form.contract_type != null && CONTRACT_TYPES_AMOUNT_DISABLED.includes(form.contract_type);

  useEffect(() => {
    if (!isOpen || ppProformaRecurrences.length === 0) return;
    const selected = ppProformaRecurrences.find((r) => Number(r.value_id) === form.pp_proforma_recurrence);
    if (selected && selected.value_name.toLowerCase() === "none" && !(form.pp_proforma_occasion ?? "").trim()) {
      onChange({ pp_proforma_occasion: selected.value_name });
    }
  }, [isOpen, form.pp_proforma_recurrence, form.pp_proforma_occasion, ppProformaRecurrences, onChange]);

  const validateAndFocus = useCallback((): boolean => {
    if (!form.contract_name?.trim()) {
      onValidationError("contract_name", "Contract name is required");
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_name?.focus(), 0);
      return false;
    }
    if (!form.customer_id) {
      onValidationError("customer_id", "Customer is required");
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.customer_id?.focus(), 0);
      return false;
    }
    if (form.contract_type == null || form.contract_type === undefined) {
      onValidationError("contract_type", "Contract type is required");
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_type?.focus(), 0);
      return false;
    }
    if (form.status == null || form.status === undefined) {
      onValidationError("status", "Status is required");
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.status?.focus(), 0);
      return false;
    }
    if (!form.contract_start_date) {
      onValidationError("contract_start_date", "Contract start date is required");
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_start_date?.focus(), 0);
      return false;
    }
    if (!amountDisabled) {
      const val = form.contract_amount_value;
      if (val == null || val === undefined || (typeof val === "number" && val <= 0)) {
        onValidationError("contract_amount_value", "Contract amount value must be greater than 0");
        setActiveTab("details");
        setTimeout(() => fieldRefs.current.contract_amount_value?.focus(), 0);
        return false;
      }
    }
    if (!form.contract_currency?.trim()) {
      onValidationError("contract_currency", "Contract currency is required");
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_currency?.focus(), 0);
      return false;
    }
    if (form.pp_proforma_recurrence == null || form.pp_proforma_recurrence === undefined) {
      onValidationError("pp_proforma_recurrence", "PP Proforma recurrence is required");
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_proforma_recurrence?.focus(), 0);
      return false;
    }
    if (!form.pp_proforma_occasion?.trim()) {
      onValidationError("pp_proforma_occasion", "PP Proforma occasion is required");
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_proforma_occasion?.focus(), 0);
      return false;
    }
    if (form.pp_initial_payment_reached_indicator == null || form.pp_initial_payment_reached_indicator === undefined) {
      onValidationError("pp_initial_payment_reached_indicator", "PP Initial payment reached indicator is required");
      setActiveTab("pp");
      return false;
    }
    if (form.pp_initial_amount_value == null || form.pp_initial_amount_value === undefined) {
      onValidationError("pp_initial_amount_value", "PP Initial amount value is required");
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_initial_amount_value?.focus(), 0);
      return false;
    }
    if (form.pp_upper_cap_reached_indicator == null || form.pp_upper_cap_reached_indicator === undefined) {
      onValidationError("pp_upper_cap_reached_indicator", "PP Upper cap reached indicator is required");
      setActiveTab("pp");
      return false;
    }
    if (form.pp_upper_cap_amount_value == null || form.pp_upper_cap_amount_value === undefined) {
      onValidationError("pp_upper_cap_amount_value", "PP Upper cap amount value is required");
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_upper_cap_amount_value?.focus(), 0);
      return false;
    }
    if (form.pp_recurrence_initial_payment_reached_indicator == null || form.pp_recurrence_initial_payment_reached_indicator === undefined) {
      onValidationError("pp_recurrence_initial_payment_reached_indicator", "PP recurrence Initial payment reached indicator is required");
      setActiveTab("pp");
      return false;
    }
    if (form.pp_recurrence_initial_amount_value == null || form.pp_recurrence_initial_amount_value === undefined) {
      onValidationError("pp_recurrence_initial_amount_value", "PP recurrence Initial amount value is required");
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_recurrence_initial_amount_value?.focus(), 0);
      return false;
    }
    if (form.pp_recurrence_upper_cap_reached_indicator == null || form.pp_recurrence_upper_cap_reached_indicator === undefined) {
      onValidationError("pp_recurrence_upper_cap_reached_indicator", "PP recurrence Upper cap reached indicator is required");
      setActiveTab("pp");
      return false;
    }
    if (form.pp_recurrence_upper_cap_amount_value == null || form.pp_recurrence_upper_cap_amount_value === undefined) {
      onValidationError("pp_recurrence_upper_cap_amount_value", "PP recurrence Upper cap amount value is required");
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_recurrence_upper_cap_amount_value?.focus(), 0);
      return false;
    }
    return true;
  }, [form, amountDisabled, onValidationError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAndFocus()) {
      onSave();
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {editingContract ? t("Edit Contract") : t("Add Contract")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {editingContract ? t("Update contract details") : t("Fill in details for the new contract")}
          </p>

          <div className="mt-4 flex gap-2 border-b border-slate-200">
            <button
              id="tab-details"
              type="button"
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "details"
                  ? "border-violet-500 text-violet-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("Contract Details")}
            </button>
            <button
              id="tab-pp"
              type="button"
              onClick={() => setActiveTab("pp")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "pp"
                  ? "border-violet-500 text-violet-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("PP Proforma")}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-5">
          {/* Tab: Contract Details */}
          {activeTab === "details" && (
          <div data-tab="details" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="contract_name" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Contract Name")} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.contract_name = el; }}
                  id="contract_name"
                  type="text"
                  maxLength={100}
                  value={form.contract_name ?? ""}
                  onChange={(e) => onChange({ contract_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="contract_description" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Contract Description")}
                </label>
                <input
                  id="contract_description"
                  type="text"
                  maxLength={200}
                  value={form.contract_description ?? ""}
                  onChange={(e) => onChange({ contract_description: e.target.value || null })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="customer_id" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Customer")} <span className="text-red-500">*</span>
                </label>
                <select
                  ref={(el) => { fieldRefs.current.customer_id = el ?? null; }}
                  id="customer_id"
                  value={form.customer_id && form.customer_id > 0 ? form.customer_id : ""}
                  onChange={(e) => onChange({ customer_id: e.target.value ? parseInt(e.target.value, 10) : 0 })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving || !!editingContract}
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
                <label htmlFor="contract_type" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Contract Type")} <span className="text-red-500">*</span>
                </label>
                <select
                  ref={(el) => { fieldRefs.current.contract_type = el ?? null; }}
                  id="contract_type"
                  value={form.contract_type != null ? form.contract_type : ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    onChange({
                      contract_type: val ?? 0,
                      contract_amount_value: val != null && CONTRACT_TYPES_AMOUNT_DISABLED.includes(val) ? null : form.contract_amount_value,
                    });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving || !!editingContract}
                >
                  <option value="">{t("Select contract type")}</option>
                  {contractTypes.map((t) => (
                    <option key={t.value_id} value={t.value_id}>
                      {t.value_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="contract_start_date" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Contract start date")} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.contract_start_date = el; }}
                  id="contract_start_date"
                  type="date"
                  value={form.contract_start_date ?? ""}
                  onChange={(e) => onChange({ contract_start_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="contract_optional_end_date" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Contract optional end date")}
                </label>
                <input
                  id="contract_optional_end_date"
                  type="date"
                  value={form.contract_optional_end_date ?? ""}
                  onChange={(e) => onChange({ contract_optional_end_date: e.target.value || null })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="contract_amount_value" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Contract amount value")} {!amountDisabled && <span className="text-red-500">*</span>}
                </label>
                <input
                  ref={(el) => { fieldRefs.current.contract_amount_value = el; }}
                  id="contract_amount_value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountDisabled ? "" : (form.contract_amount_value ?? "")}
                  onChange={(e) =>
                    onChange({
                      contract_amount_value: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  disabled={isSaving || amountDisabled}
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 ${amountDisabled ? "bg-slate-100 cursor-not-allowed" : ""}`}
                />
              </div>

              <div>
                <label htmlFor="contract_currency" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("Contract currency")} <span className="text-red-500">*</span>
                </label>
                <select
                  ref={(el) => { fieldRefs.current.contract_currency = el ?? null; }}
                  id="contract_currency"
                  value={form.contract_currency ?? ""}
                  onChange={(e) => onChange({ contract_currency: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving}
                >
                  <option value="">{t("Select currency")}</option>
                  {CURRENCY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          )}

          {/* Tab: PP Proforma */}
          {activeTab === "pp" && (() => {
            const selectedRecurrence = ppProformaRecurrences.find((r) => Number(r.value_id) === form.pp_proforma_recurrence);
            const isOccasionDisabled = !!selectedRecurrence && selectedRecurrence.value_name.toLowerCase() === "none";
            return (
          <div data-tab="pp" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pp_proforma_recurrence" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("PP Proforma recurrence")} <span className="text-red-500">*</span>
                </label>
                <select
                  ref={(el) => { fieldRefs.current.pp_proforma_recurrence = el ?? null; }}
                  id="pp_proforma_recurrence"
                  value={form.pp_proforma_recurrence != null ? form.pp_proforma_recurrence : ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : 0;
                    const selected = ppProformaRecurrences.find((r) => Number(r.value_id) === val);
                    const updates: Partial<CreateContractInput & { status: number }> = {
                      pp_proforma_recurrence: val,
                    };
                    if (selected && selected.value_name.toLowerCase() === "none") {
                      updates.pp_proforma_occasion = selected.value_name;
                    } else {
                      updates.pp_proforma_occasion = "";
                    }
                    onChange(updates);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving}
                >
                  <option value="">{t("Select recurrence")}</option>
                  {ppProformaRecurrences.map((r) => (
                    <option key={r.value_id} value={r.value_id}>
                      {r.value_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pp_proforma_occasion" className="block text-sm font-medium text-slate-700 mb-2">
                  {t("PP Proforma occasion")} <span className="text-red-500">*</span>
                  <span
                    className="ml-1 inline-flex align-middle text-slate-400 hover:text-slate-600 cursor-help"
                    title={
                      form.pp_proforma_recurrence != null && form.pp_proforma_recurrence !== undefined
                        ? (ppProformaOccasions.find((o) => Number(o.value_id) === form.pp_proforma_recurrence)
                            ?.value_name ?? t("No suggested value for this recurrence"))
                        : t("Select a recurrence to see suggested occasion")
                    }
                    aria-label={t("Suggested value for selected recurrence")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.pp_proforma_occasion = el; }}
                  id="pp_proforma_occasion"
                  type="text"
                  maxLength={20}
                  value={form.pp_proforma_occasion ?? ""}
                  onChange={(e) => onChange({ pp_proforma_occasion: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 ${isOccasionDisabled ? "bg-slate-100 cursor-not-allowed" : ""}`}
                  disabled={isSaving || isOccasionDisabled}
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("PP Initial Payment Reached Indicator")} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {([1, 0] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onChange({ pp_initial_payment_reached_indicator: v })}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          form.pp_initial_payment_reached_indicator === v
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {v === 1 ? t("Yes") : t("No")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="pp_initial_amount_value" className="block text-sm font-medium text-slate-700 mb-2">
                    {t("PP Initial amount value")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { fieldRefs.current.pp_initial_amount_value = el; }}
                    id="pp_initial_amount_value"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.pp_initial_amount_value ?? 0}
                    onChange={(e) =>
                      onChange({ pp_initial_amount_value: e.target.value ? parseFloat(e.target.value) : 0 })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("PP Upper Cap Reached Indicator")} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {([1, 0] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onChange({ pp_upper_cap_reached_indicator: v })}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          form.pp_upper_cap_reached_indicator === v
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {v === 1 ? t("Yes") : t("No")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="pp_upper_cap_amount_value" className="block text-sm font-medium text-slate-700 mb-2">
                    {t("PP Upper cap amount value")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { fieldRefs.current.pp_upper_cap_amount_value = el; }}
                    id="pp_upper_cap_amount_value"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.pp_upper_cap_amount_value ?? 0}
                    onChange={(e) =>
                      onChange({ pp_upper_cap_amount_value: e.target.value ? parseFloat(e.target.value) : 0 })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PP Recurrence Initial Payment Reached Indicator <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {([1, 0] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onChange({ pp_recurrence_initial_payment_reached_indicator: v })}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          form.pp_recurrence_initial_payment_reached_indicator === v
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {v === 1 ? t("Yes") : t("No")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="pp_recurrence_initial_amount_value" className="block text-sm font-medium text-slate-700 mb-2">
                    {t("PP recurrence Initial amount value")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { fieldRefs.current.pp_recurrence_initial_amount_value = el; }}
                    id="pp_recurrence_initial_amount_value"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.pp_recurrence_initial_amount_value ?? 0}
                    onChange={(e) =>
                      onChange({
                        pp_recurrence_initial_amount_value: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("PP recurrence Upper cap reached indicator")} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {([1, 0] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onChange({ pp_recurrence_upper_cap_reached_indicator: v })}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          form.pp_recurrence_upper_cap_reached_indicator === v
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {v === 1 ? t("Yes") : t("No")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="pp_recurrence_upper_cap_amount_value" className="block text-sm font-medium text-slate-700 mb-2">
                    {t("PP recurrence Upper cap amount value")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { fieldRefs.current.pp_recurrence_upper_cap_amount_value = el; }}
                    id="pp_recurrence_upper_cap_amount_value"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.pp_recurrence_upper_cap_amount_value ?? 0}
                    onChange={(e) =>
                      onChange({
                        pp_recurrence_upper_cap_amount_value: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t("Status")} <span className="text-red-500">*</span></label>
                <div className="flex gap-3" ref={(el) => { if (el) fieldRefs.current.status = el.querySelector("button"); }}>
                  {([1, 2, 3] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChange({ status: s })}
                      disabled={isSaving}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        form.status === s
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {t(STATUS_KEYS[s])}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
            );
          })()}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
            >
              {editingContract ? t("Update") : t("Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
