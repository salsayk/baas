"use client";

import { useRef, useEffect, useLayoutEffect, useCallback, useState, useMemo } from "react";
import { CURRENCY_CODES } from "@/database/contracts/currencies";
import type { CreateContractInput, Contract } from "@/database/contracts/types";

const STATUS_KEYS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const CONTRACT_TYPES_AMOUNT_DISABLED = [2, 4];

/** Translation source_text keys for contract amount tooltip by Contract Type value_id. */
const CONTRACT_AMOUNT_TOOLTIP_BY_TYPE_ID: Record<number, string> = {
  0: "Greater than 0. Reflects contract total amount.",
  1: "Greater than 0. Reflects contract total amount.",
  2: "Irrelevant.",
  3: "Greater than 0. Reflects contract periodical payment amount, and not contract total amount.",
  4: "Irrelevant.",
};

function getContractAmountTooltipKey(contractTypeNum: number): string | null {
  if (!Number.isFinite(contractTypeNum)) return null;
  return CONTRACT_AMOUNT_TOOLTIP_BY_TYPE_ID[contractTypeNum] ?? null;
}

/** Default `pp_proforma_occasion` by PP Proforma recurrence lookup value_id: 1 weekly, 2–3 monthly, 4 yearly. */
function getDefaultPpProformaOccasionForRecurrence(
  recurrenceValueId: number,
  translate: (sourceText: string) => string
): string {
  if (recurrenceValueId === 1) return translate("Sunday");
  if (recurrenceValueId === 2 || recurrenceValueId === 3) return "1";
  if (recurrenceValueId === 4) return "31/12";
  return "";
}

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

  const PP_REQUIRED_CONTRACT_TYPES = [2, 3] as const;
  /** Contract type value_id for hourly: shows the second PP group (recurrence caps). Type 3 hides it and uses zeros. */
  const PP_HOURLY_CONTRACT_TYPE = 2;
  /** Default PP recurrence when contract types 2 or 3 (weekly in your lookup table). */
  const PP_DEFAULT_RECURRENCE_ID = 1;
  // null = not chosen; 0 can be a valid lookup value_id. Coerce for [2,3].includes(string).
  const contractTypeUnset = form.contract_type === null || form.contract_type === undefined;
  const contractTypeNum = contractTypeUnset ? NaN : Number(form.contract_type);
  const hasValidContractType = !contractTypeUnset && Number.isFinite(contractTypeNum);
  const amountDisabled = hasValidContractType && CONTRACT_TYPES_AMOUNT_DISABLED.includes(contractTypeNum);
  const shouldShowPpTab = hasValidContractType && PP_REQUIRED_CONTRACT_TYPES.includes(contractTypeNum as 2 | 3);
  const showPpRecurrenceCapBlock = shouldShowPpTab && contractTypeNum === PP_HOURLY_CONTRACT_TYPE;

  const contractAmountTooltipKey = useMemo(
    () => (hasValidContractType ? getContractAmountTooltipKey(contractTypeNum) : null),
    [hasValidContractType, contractTypeNum]
  );

  // Wizard: reset to first tab when opening (useLayoutEffect avoids stale tab from last session
  // before paint — otherwise Save/Next can show the wrong label).
  useLayoutEffect(() => {
    if (isOpen) setActiveTab("details");
  }, [isOpen, editingContract?.contract_id]);

  const ppRecurrenceOptionsWhenPpRequired = useMemo(
    () => ppProformaRecurrences.filter((r) => Number(r.value_id) !== 0),
    [ppProformaRecurrences]
  );

  // If PP tab applies but recurrence is still 0, coerce to weekly (value_id 1) before paint.
  useLayoutEffect(() => {
    if (!isOpen || !shouldShowPpTab || ppProformaRecurrences.length === 0) return;
    if (Number(form.pp_proforma_recurrence) !== 0) return;
    onChange({
      pp_proforma_recurrence: PP_DEFAULT_RECURRENCE_ID,
      pp_proforma_occasion: getDefaultPpProformaOccasionForRecurrence(PP_DEFAULT_RECURRENCE_ID, t),
    });
  }, [isOpen, shouldShowPpTab, form.pp_proforma_recurrence, ppProformaRecurrences, onChange, t]);

  useLayoutEffect(() => {
    if (!isOpen || shouldShowPpTab) return;
    const rec = Number(form.pp_proforma_recurrence);
    const occ = (form.pp_proforma_occasion ?? "").trim();
    if (rec === 0 && occ === "None") return;
    onChange({ pp_proforma_recurrence: 0, pp_proforma_occasion: "None" });
  }, [isOpen, shouldShowPpTab, form.pp_proforma_recurrence, form.pp_proforma_occasion, onChange]);

  // If contract type no longer requires PP, force the UI back to the first tab.
  useEffect(() => {
    if (!shouldShowPpTab && activeTab === "pp") setActiveTab("details");
  }, [shouldShowPpTab, activeTab]);

  useEffect(() => {
    if (!isOpen || ppProformaRecurrences.length === 0) return;
    const selected = ppProformaRecurrences.find((r) => Number(r.value_id) === form.pp_proforma_recurrence);
    if (selected && selected.value_name.toLowerCase() === "none" && !(form.pp_proforma_occasion ?? "").trim()) {
      onChange({ pp_proforma_occasion: selected.value_name });
    }
  }, [isOpen, form.pp_proforma_recurrence, form.pp_proforma_occasion, ppProformaRecurrences, onChange]);

  // Type 3 (non-hourly PP): hidden recurrence-cap fields must stay at 0.
  useLayoutEffect(() => {
    if (!isOpen || !shouldShowPpTab || contractTypeNum !== 3) return;
    if (
      Number(form.pp_recurrence_initial_payment_reached_indicator) === 0 &&
      Number(form.pp_recurrence_initial_amount_value) === 0 &&
      Number(form.pp_recurrence_upper_cap_reached_indicator) === 0 &&
      Number(form.pp_recurrence_upper_cap_amount_value) === 0
    )
      return;
    onChange({
      pp_recurrence_initial_payment_reached_indicator: 0,
      pp_recurrence_initial_amount_value: 0,
      pp_recurrence_upper_cap_reached_indicator: 0,
      pp_recurrence_upper_cap_amount_value: 0,
    });
  }, [
    isOpen,
    shouldShowPpTab,
    contractTypeNum,
    form.pp_recurrence_initial_payment_reached_indicator,
    form.pp_recurrence_initial_amount_value,
    form.pp_recurrence_upper_cap_reached_indicator,
    form.pp_recurrence_upper_cap_amount_value,
    onChange,
  ]);

  const isDetailsTabFieldsValid =
    !!form.contract_name?.trim() &&
    !!form.customer_id &&
    hasValidContractType &&
    form.status != null &&
    form.status !== undefined &&
    !!form.contract_start_date &&
    (amountDisabled ||
      (form.contract_amount_value != null &&
        typeof form.contract_amount_value === "number" &&
        form.contract_amount_value > 0)) &&
    !!form.contract_currency?.trim();

  const isDetailsValid = isDetailsTabFieldsValid;

  const isPpRecurrenceCapsValid =
    contractTypeNum === 3
      ? Number(form.pp_recurrence_initial_payment_reached_indicator) === 0 &&
        Number(form.pp_recurrence_initial_amount_value) === 0 &&
        Number(form.pp_recurrence_upper_cap_reached_indicator) === 0 &&
        Number(form.pp_recurrence_upper_cap_amount_value) === 0
      : form.pp_recurrence_initial_payment_reached_indicator != null &&
        form.pp_recurrence_initial_amount_value != null &&
        form.pp_recurrence_upper_cap_reached_indicator != null &&
        form.pp_recurrence_upper_cap_amount_value != null;

  const isPpValid =
    shouldShowPpTab &&
    form.pp_proforma_recurrence != null &&
    Number(form.pp_proforma_recurrence) !== 0 &&
    !!form.pp_proforma_occasion?.trim() &&
    form.pp_initial_payment_reached_indicator != null &&
    form.pp_initial_amount_value != null &&
    form.pp_upper_cap_reached_indicator != null &&
    form.pp_upper_cap_amount_value != null &&
    isPpRecurrenceCapsValid;

  const validateDetailsAndFocus = useCallback((): boolean => {
    if (!form.contract_name?.trim()) {
      onValidationError("contract_name", t("Contract name is required"));
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_name?.focus(), 0);
      return false;
    }
    if (!form.customer_id) {
      onValidationError("customer_id", t("Customer is required"));
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.customer_id?.focus(), 0);
      return false;
    }
    if (!hasValidContractType) {
      onValidationError("contract_type", t("Contract type is required"));
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_type?.focus(), 0);
      return false;
    }
    if (form.status == null || form.status === undefined) {
      onValidationError("status", t("Status is required"));
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.status?.focus(), 0);
      return false;
    }
    if (!form.contract_start_date) {
      onValidationError("contract_start_date", t("Contract start date is required"));
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_start_date?.focus(), 0);
      return false;
    }
    if (!amountDisabled) {
      const val = form.contract_amount_value;
      if (val == null || val === undefined || (typeof val === "number" && val <= 0)) {
        onValidationError("contract_amount_value", t("Contract amount value must be greater than 0"));
        setActiveTab("details");
        setTimeout(() => fieldRefs.current.contract_amount_value?.focus(), 0);
        return false;
      }
    }
    if (!form.contract_currency?.trim()) {
      onValidationError("contract_currency", t("Contract currency is required"));
      setActiveTab("details");
      setTimeout(() => fieldRefs.current.contract_currency?.focus(), 0);
      return false;
    }
    return true;
  }, [form, amountDisabled, hasValidContractType, onValidationError, t]);

  const goToPrevTab = useCallback(() => {
    if (!shouldShowPpTab || activeTab !== "pp" || isSaving) return;
    setActiveTab("details");
  }, [shouldShowPpTab, activeTab, isSaving]);

  const goToNextTab = useCallback(() => {
    if (!shouldShowPpTab || activeTab !== "details" || isSaving) return;
    if (validateDetailsAndFocus()) setActiveTab("pp");
  }, [shouldShowPpTab, activeTab, isSaving, validateDetailsAndFocus]);

  const validatePpAndFocus = useCallback((): boolean => {
    if (!shouldShowPpTab) return true;

    if (form.pp_proforma_recurrence == null || form.pp_proforma_recurrence === undefined) {
      onValidationError("pp_proforma_recurrence", t("PP Proforma recurrence is required"));
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_proforma_recurrence?.focus(), 0);
      return false;
    }
    if (Number(form.pp_proforma_recurrence) === 0) {
      onValidationError("pp_proforma_recurrence", t("PP Proforma recurrence is required"));
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_proforma_recurrence?.focus(), 0);
      return false;
    }
    if (!form.pp_proforma_occasion?.trim()) {
      onValidationError("pp_proforma_occasion", t("PP Proforma occasion is required"));
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_proforma_occasion?.focus(), 0);
      return false;
    }
    if (form.pp_initial_payment_reached_indicator == null || form.pp_initial_payment_reached_indicator === undefined) {
      onValidationError("pp_initial_payment_reached_indicator", t("PP Initial payment reached indicator is required"));
      setActiveTab("pp");
      return false;
    }
    if (form.pp_initial_amount_value == null || form.pp_initial_amount_value === undefined) {
      onValidationError("pp_initial_amount_value", t("PP Initial amount value is required"));
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_initial_amount_value?.focus(), 0);
      return false;
    }
    if (form.pp_upper_cap_reached_indicator == null || form.pp_upper_cap_reached_indicator === undefined) {
      onValidationError("pp_upper_cap_reached_indicator", t("PP Upper cap reached indicator is required"));
      setActiveTab("pp");
      return false;
    }
    if (form.pp_upper_cap_amount_value == null || form.pp_upper_cap_amount_value === undefined) {
      onValidationError("pp_upper_cap_amount_value", t("PP Upper cap amount value is required"));
      setActiveTab("pp");
      setTimeout(() => fieldRefs.current.pp_upper_cap_amount_value?.focus(), 0);
      return false;
    }
    if (contractTypeNum === PP_HOURLY_CONTRACT_TYPE) {
      if (form.pp_recurrence_initial_payment_reached_indicator == null || form.pp_recurrence_initial_payment_reached_indicator === undefined) {
        onValidationError(
          "pp_recurrence_initial_payment_reached_indicator",
          t("PP recurrence Initial payment reached indicator is required")
        );
        setActiveTab("pp");
        return false;
      }
      if (form.pp_recurrence_initial_amount_value == null || form.pp_recurrence_initial_amount_value === undefined) {
        onValidationError("pp_recurrence_initial_amount_value", t("PP recurrence Initial amount value is required"));
        setActiveTab("pp");
        setTimeout(() => fieldRefs.current.pp_recurrence_initial_amount_value?.focus(), 0);
        return false;
      }
      if (form.pp_recurrence_upper_cap_reached_indicator == null || form.pp_recurrence_upper_cap_reached_indicator === undefined) {
        onValidationError(
          "pp_recurrence_upper_cap_reached_indicator",
          t("PP recurrence Upper cap reached indicator is required")
        );
        setActiveTab("pp");
        return false;
      }
      if (form.pp_recurrence_upper_cap_amount_value == null || form.pp_recurrence_upper_cap_amount_value === undefined) {
        onValidationError(
          "pp_recurrence_upper_cap_amount_value",
          t("PP recurrence Upper cap amount value is required")
        );
        setActiveTab("pp");
        setTimeout(() => fieldRefs.current.pp_recurrence_upper_cap_amount_value?.focus(), 0);
        return false;
      }
    }
    return true;
  }, [contractTypeNum, form, onValidationError, shouldShowPpTab, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Tab 1 -> Tab 2
    if (shouldShowPpTab && activeTab === "details") {
      if (validateDetailsAndFocus()) setActiveTab("pp");
      return;
    }

    // Final step validations
    if (!activeTab) return;
    if (!validateDetailsAndFocus()) return;
    if (activeTab === "pp" && !validatePpAndFocus()) return;

    onSave();
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

          <div className="mt-4 flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button
              id="tab-details"
              type="button"
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "details"
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {t("Contract Details")}
            </button>
            {shouldShowPpTab && (
              <button
                id="tab-pp"
                type="button"
                onClick={() => {
                  if (isDetailsTabFieldsValid) setActiveTab("pp");
                  else validateDetailsAndFocus();
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === "pp"
                    ? "border-violet-500 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {t("PP Proforma")}
              </button>
            )}
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
                  value={contractTypeUnset ? "" : contractTypeNum}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      onChange({
                        contract_type: null,
                        pp_proforma_recurrence: 0,
                        pp_proforma_occasion: "None",
                      });
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    const val = Number.isNaN(parsed) ? null : parsed;
                    const updates: Partial<CreateContractInput & { status: number }> = {
                      contract_type: val,
                      contract_amount_value:
                        val != null && CONTRACT_TYPES_AMOUNT_DISABLED.includes(val) ? null : form.contract_amount_value,
                    };
                    if (val != null && PP_REQUIRED_CONTRACT_TYPES.includes(val as 2 | 3)) {
                      updates.pp_proforma_recurrence = PP_DEFAULT_RECURRENCE_ID;
                      updates.pp_proforma_occasion = getDefaultPpProformaOccasionForRecurrence(
                        PP_DEFAULT_RECURRENCE_ID,
                        t
                      );
                      if (val === 3) {
                        updates.pp_recurrence_initial_payment_reached_indicator = 0;
                        updates.pp_recurrence_initial_amount_value = 0;
                        updates.pp_recurrence_upper_cap_reached_indicator = 0;
                        updates.pp_recurrence_upper_cap_amount_value = 0;
                      }
                    } else if (val != null) {
                      updates.pp_proforma_recurrence = 0;
                      updates.pp_proforma_occasion = "None";
                    }
                    onChange(updates);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  disabled={isSaving}
                >
                  <option value="">{t("Select contract type")}</option>
                  {contractTypes.map((ct) => (
                    <option key={ct.value_id} value={ct.value_id}>
                      {t(ct.value_name)}
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
                <label htmlFor="contract_amount_value" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t("Contract amount value")} {!amountDisabled && <span className="text-red-500">*</span>}
                  {contractAmountTooltipKey ? (
                    <span
                      className="ml-1 inline-flex align-middle text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
                      title={t(contractAmountTooltipKey)}
                      aria-label={t("Contract amount guidance")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                    </span>
                  ) : null}
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

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t("Status")} <span className="text-red-500">*</span>
                </label>
                <div
                  className="flex gap-3"
                  ref={(el) => {
                    if (el) fieldRefs.current.status = el.querySelector("button");
                  }}
                >
                  {([1, 2, 3] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChange({ status: s })}
                      disabled={isSaving}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        form.status === s
                          ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {t(STATUS_KEYS[s])}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Tab: PP Proforma */}
          {activeTab === "pp" && shouldShowPpTab && (() => {
            const selectedRecurrence = ppProformaRecurrences.find((r) => Number(r.value_id) === form.pp_proforma_recurrence);
            const isOccasionDisabled = !!selectedRecurrence && selectedRecurrence.value_name.toLowerCase() === "none";
            return (
          <div data-tab="pp" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-stretch">
              <div className="flex flex-col h-full min-h-0">
                <label
                  htmlFor="pp_proforma_recurrence"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  {t("PP Proforma recurrence")} <span className="text-red-500">*</span>
                </label>
                <div className="mt-auto w-full">
                  <select
                    ref={(el) => { fieldRefs.current.pp_proforma_recurrence = el ?? null; }}
                    id="pp_proforma_recurrence"
                    value={
                      form.pp_proforma_recurrence != null && Number(form.pp_proforma_recurrence) !== 0
                        ? form.pp_proforma_recurrence
                        : PP_DEFAULT_RECURRENCE_ID
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isFinite(val) || val === 0) return;
                      const selected = ppProformaRecurrences.find((r) => Number(r.value_id) === val);
                      const updates: Partial<CreateContractInput & { status: number }> = {
                        pp_proforma_recurrence: val,
                      };
                      if (selected && selected.value_name.toLowerCase() === "none") {
                        updates.pp_proforma_occasion = selected.value_name;
                      } else {
                        updates.pp_proforma_occasion = getDefaultPpProformaOccasionForRecurrence(val, t);
                      }
                      onChange(updates);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    disabled={isSaving || ppRecurrenceOptionsWhenPpRequired.length === 0}
                  >
                    {ppRecurrenceOptionsWhenPpRequired.map((r) => (
                      <option key={r.value_id} value={r.value_id}>
                        {t(r.value_name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col h-full min-h-0">
                <label
                  htmlFor="pp_proforma_occasion"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  {t("PP Proforma occasion")} <span className="text-red-500">*</span>
                  <span
                    className="ml-1 inline-flex align-middle text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 cursor-help"
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
                <div className="mt-auto w-full">
                  <input
                    ref={(el) => { fieldRefs.current.pp_proforma_occasion = el; }}
                    id="pp_proforma_occasion"
                    type="text"
                    maxLength={20}
                    value={form.pp_proforma_occasion ?? ""}
                    onChange={(e) => onChange({ pp_proforma_occasion: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 ${isOccasionDisabled ? "bg-slate-100 dark:bg-slate-800 cursor-not-allowed" : ""}`}
                    disabled={isSaving || isOccasionDisabled}
                  />
                </div>
              </div>

              <section className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/90 dark:bg-slate-800/45 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-stretch">
                  <div className="flex flex-col h-full min-h-0">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t("PP Initial payment reached indicator")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full flex gap-3">
                      {([1, 0] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onChange({ pp_initial_payment_reached_indicator: v })}
                          disabled={isSaving}
                          className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            form.pp_initial_payment_reached_indicator === v
                              ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {v === 1 ? t("Yes") : t("No")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col h-full min-h-0">
                    <label
                      htmlFor="pp_initial_amount_value"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      {t("PP Initial amount value")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full">
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
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-stretch">
                  <div className="flex flex-col h-full min-h-0">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t("PP Upper cap reached indicator")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full flex gap-3">
                      {([1, 0] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onChange({ pp_upper_cap_reached_indicator: v })}
                          disabled={isSaving}
                          className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            form.pp_upper_cap_reached_indicator === v
                              ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {v === 1 ? t("Yes") : t("No")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col h-full min-h-0">
                    <label
                      htmlFor="pp_upper_cap_amount_value"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      {t("PP Upper cap amount value")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full">
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
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {showPpRecurrenceCapBlock && (
              <section className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/90 dark:bg-slate-800/45 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-stretch">
                  <div className="flex flex-col h-full min-h-0">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t("PP recurrence Initial payment reached indicator")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full flex gap-3">
                      {([1, 0] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onChange({ pp_recurrence_initial_payment_reached_indicator: v })}
                          disabled={isSaving}
                          className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            form.pp_recurrence_initial_payment_reached_indicator === v
                              ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {v === 1 ? t("Yes") : t("No")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col h-full min-h-0">
                    <label
                      htmlFor="pp_recurrence_initial_amount_value"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      {t("PP recurrence Initial amount value")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full">
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
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-stretch">
                  <div className="flex flex-col h-full min-h-0">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t("PP recurrence Upper cap reached indicator")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full flex gap-3">
                      {([1, 0] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onChange({ pp_recurrence_upper_cap_reached_indicator: v })}
                          disabled={isSaving}
                          className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            form.pp_recurrence_upper_cap_reached_indicator === v
                              ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {v === 1 ? t("Yes") : t("No")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col h-full min-h-0">
                    <label
                      htmlFor="pp_recurrence_upper_cap_amount_value"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      {t("PP recurrence Upper cap amount value")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-auto w-full">
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
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              </section>
              )}
            </div>
          </div>
            );
          })()}

          <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            {shouldShowPpTab ? (
              <div className="flex gap-2 order-2 sm:order-1 justify-stretch sm:justify-start">
                <button
                  type="button"
                  onClick={goToPrevTab}
                  disabled={isSaving || activeTab === "details"}
                  className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("Previous")}
                </button>
                {activeTab === "details" ? (
                  <button
                    type="button"
                    onClick={goToNextTab}
                    disabled={isSaving || !isDetailsTabFieldsValid}
                    className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("Next")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-hidden
                    className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium opacity-40 cursor-not-allowed"
                  >
                    {t("Next")}
                  </button>
                )}
              </div>
            ) : null}
            <div
              className={`flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end ${shouldShowPpTab ? "order-1 sm:order-2 w-full sm:w-auto" : "w-full sm:justify-end"}`}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t("Cancel")}
              </button>
              {shouldShowPpTab && activeTab === "details" ? null : (
                <button
                  type="submit"
                  disabled={isSaving || !isDetailsValid || (shouldShowPpTab ? !isPpValid : false)}
                  className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 hover:bg-violet-700"
                >
                  {editingContract ? t("Update") : t("Save")}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
