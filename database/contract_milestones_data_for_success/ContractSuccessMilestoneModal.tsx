"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTranslations } from "@/app/context/TranslationContext";
import type { Contract } from "@/database/contracts/types";
import type {
  ContractMilestoneSuccessData,
  CreateContractMilestoneSuccessInput,
} from "./types";

interface LookupValue {
  value_id: number;
  value_name: string;
}

interface Props {
  isOpen: boolean;
  editingMilestone: ContractMilestoneSuccessData | null;
  form: CreateContractMilestoneSuccessInput;
  isSaving: boolean;
  contract: Contract | null;
  apiFieldError?: string | null;
  apiErrorMessage?: string | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateContractMilestoneSuccessInput>) => void;
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ContractSuccessMilestoneModal({
  isOpen,
  editingMilestone,
  form,
  isSaving,
  onClose,
  onSave,
  onChange,
  apiFieldError = null,
  apiErrorMessage = null,
}: Props) {
  const { t } = useTranslations();
  const { languageId } = useLanguage();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progressStatusOptions, setProgressStatusOptions] = useState<LookupValue[]>([]);
  const [milestoneTypeOptions, setMilestoneTypeOptions] = useState<LookupValue[]>([]);

  const isPercentageType = Number(form.milestone_type) === 1;
  const isFixedType = Number(form.milestone_type) === 0;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const langParam = languageId ? `&language_id=${languageId}` : "";
        const [progressRes, typeRes] = await Promise.all([
          fetch(`/api/system-lookup-values?lookup_table_id=15${langParam}`),
          fetch(`/api/system-lookup-values?lookup_table_id=16${langParam}`),
        ]);
        if (cancelled) return;
        if (progressRes.ok) {
          const data = await progressRes.json();
          setProgressStatusOptions(
            (Array.isArray(data) ? data : []).map((row) => ({
              value_id: Number(row.value_id),
              value_name: String(row.value_name ?? ""),
            }))
          );
        } else {
          setProgressStatusOptions([]);
        }
        if (typeRes.ok) {
          const data = await typeRes.json();
          setMilestoneTypeOptions(
            (Array.isArray(data) ? data : []).map((row) => ({
              value_id: Number(row.value_id),
              value_name: String(row.value_name ?? ""),
            }))
          );
        } else {
          setMilestoneTypeOptions([]);
        }
      } catch {
        if (!cancelled) {
          setProgressStatusOptions([]);
          setMilestoneTypeOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, languageId]);

  useEffect(() => {
    if (!isOpen) setValidationError(null);
  }, [isOpen]);

  const maxPaymentDisabled = useMemo(
    () =>
      isFixedType ||
      form.min_payment_amount == null ||
      Number.isNaN(Number(form.min_payment_amount)),
    [form.min_payment_amount, isFixedType]
  );
  const fieldError = (name: string) => apiFieldError === name;

  const handleMilestoneTypeChange = (raw: string) => {
    const type = raw === "" ? null : Number(raw);
    if (type === 1) {
      onChange({
        milestone_type: 1,
        milestone_amount: null,
      });
      return;
    }
    if (type === 0) {
      onChange({
        milestone_type: 0,
        milestone_percentage: null,
        milestone_percentage_reference_figure: null,
        milestone_percentage_reference_figure_description: null,
      });
      return;
    }
    onChange({ milestone_type: type });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (form.milestone_type == null || ![0, 1].includes(Number(form.milestone_type))) {
      setValidationError(t("Milestone type is required"));
      return;
    }
    if (!form.milestone_criteria?.trim()) {
      setValidationError(t("Milestone criteria is required"));
      return;
    }
    if (isFixedType) {
      if (form.milestone_amount == null || Number.isNaN(Number(form.milestone_amount))) {
        setValidationError(t("Milestone amount is required"));
        return;
      }
    }
    if (isPercentageType) {
      const pct = Number(form.milestone_percentage);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setValidationError(t("Milestone percentage must be between 0 and 100"));
        return;
      }
      if (
        form.milestone_percentage_reference_figure == null ||
        Number.isNaN(Number(form.milestone_percentage_reference_figure))
      ) {
        setValidationError(t("Milestone percentage reference figure is required"));
        return;
      }
      if (!form.milestone_percentage_reference_figure_description?.trim()) {
        setValidationError(t("Milestone percentage reference figure description is required"));
        return;
      }
    }
    if (
      form.min_payment_amount != null &&
      form.max_payment_amount != null &&
      Number(form.max_payment_amount) < Number(form.min_payment_amount)
    ) {
      setValidationError(t("Maximum payment amount must be greater than or equal to minimum payment amount"));
      return;
    }
    onSave();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-5xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="sticky top-0 bg-white dark:bg-slate-900 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {editingMilestone ? t("Edit milestone") : t("Add milestone")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="milestone_criteria" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Milestone criteria")} <span className="text-red-500">*</span>
              </label>
              <input
                id="milestone_criteria"
                maxLength={200}
                value={form.milestone_criteria ?? ""}
                onChange={(e) => onChange({ milestone_criteria: e.target.value || null })}
                className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${
                  fieldError("milestone_criteria") ? "border-red-500 ring-1 ring-red-400" : "border-slate-200"
                }`}
                disabled={isSaving}
                required
              />
            </div>

            <div>
              <label htmlFor="milestone_due_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Milestone due date")}
              </label>
              <input
                id="milestone_due_date"
                type="date"
                value={toInputDate(form.milestone_due_date)}
                onChange={(e) => onChange({ milestone_due_date: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="milestone_type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Milestone type")} <span className="text-red-500">*</span>
              </label>
              <select
                id="milestone_type"
                value={form.milestone_type == null ? "" : String(form.milestone_type)}
                onChange={(e) => handleMilestoneTypeChange(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${
                  fieldError("milestone_type") ? "border-red-500 ring-1 ring-red-400" : "border-slate-200"
                }`}
                disabled={isSaving}
                required
              >
                <option value="">{t("Select milestone type")}</option>
                {milestoneTypeOptions.map((opt) => (
                  <option key={opt.value_id} value={opt.value_id}>
                    {opt.value_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="milestone_amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Milestone amount")} {isFixedType ? <span className="text-red-500">*</span> : null}
              </label>
              <input
                id="milestone_amount"
                type="number"
                min={0}
                step="0.01"
                value={form.milestone_amount ?? ""}
                onChange={(e) => onChange({ milestone_amount: e.target.value === "" ? null : Number(e.target.value) })}
                className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                  fieldError("milestone_amount") ? "border-red-500 ring-1 ring-red-400" : "border-slate-200"
                }`}
                disabled={isSaving || isPercentageType}
                required={isFixedType}
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="milestone_percentage_reference_figure" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t("Milestone percentage reference figure")} {isPercentageType ? <span className="text-red-500">*</span> : null}
                </label>
                <input
                  id="milestone_percentage_reference_figure"
                  type="number"
                  step="0.01"
                  value={form.milestone_percentage_reference_figure ?? ""}
                  onChange={(e) =>
                    onChange({
                      milestone_percentage_reference_figure: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                    fieldError("milestone_percentage_reference_figure")
                      ? "border-red-500 ring-1 ring-red-400"
                      : "border-slate-200"
                  }`}
                  disabled={isSaving || isFixedType}
                  required={isPercentageType}
                />
              </div>

              <div>
                <label htmlFor="milestone_percentage" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t("Milestone percentage")} {isPercentageType ? <span className="text-red-500">*</span> : null}
                </label>
                <input
                  id="milestone_percentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.milestone_percentage ?? ""}
                  onChange={(e) => onChange({ milestone_percentage: e.target.value === "" ? null : Number(e.target.value) })}
                  className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                    fieldError("milestone_percentage") ? "border-red-500 ring-1 ring-red-400" : "border-slate-200"
                  }`}
                  disabled={isSaving || isFixedType}
                  required={isPercentageType}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="milestone_percentage_reference_figure_description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Milestone percentage reference figure description")} {isPercentageType ? <span className="text-red-500">*</span> : null}
              </label>
              <input
                id="milestone_percentage_reference_figure_description"
                maxLength={200}
                value={form.milestone_percentage_reference_figure_description ?? ""}
                onChange={(e) =>
                  onChange({
                    milestone_percentage_reference_figure_description: e.target.value === "" ? null : e.target.value,
                  })
                }
                className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                  fieldError("milestone_percentage_reference_figure_description")
                    ? "border-red-500 ring-1 ring-red-400"
                    : "border-slate-200"
                }`}
                disabled={isSaving || isFixedType}
                required={isPercentageType}
              />
            </div>

            <div>
              <label htmlFor="min_payment_amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Minimum payment amount")}
              </label>
              <input
                id="min_payment_amount"
                type="number"
                step="0.01"
                value={form.min_payment_amount ?? ""}
                onChange={(e) => onChange({ min_payment_amount: e.target.value === "" ? null : Number(e.target.value) })}
                className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                  fieldError("min_payment_amount") ? "border-red-500 ring-1 ring-red-400" : "border-slate-200"
                }`}
                disabled={isSaving || isFixedType}
              />
            </div>

            <div>
              <label htmlFor="max_payment_amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Maximum payment amount")}
              </label>
              <input
                id="max_payment_amount"
                type="number"
                step="0.01"
                value={form.max_payment_amount ?? ""}
                onChange={(e) => onChange({ max_payment_amount: e.target.value === "" ? null : Number(e.target.value) })}
                className={`w-full px-4 py-3 rounded-xl border dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                  fieldError("max_payment_amount") ? "border-red-500 ring-1 ring-red-400" : "border-slate-200"
                }`}
                disabled={isSaving || maxPaymentDisabled}
              />
            </div>

            <div>
              <label htmlFor="progress_status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Progress status")}
              </label>
              <select
                id="progress_status"
                value={form.progress_status == null ? "" : String(form.progress_status)}
                onChange={(e) => onChange({ progress_status: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={isSaving}
              >
                <option value="">{t("Select progress status")}</option>
                {progressStatusOptions.map((opt) => (
                  <option key={opt.value_id} value={opt.value_id}>
                    {opt.value_name}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="hidden"
              value={form.milestone_condition_met_indicator == null ? 0 : form.milestone_condition_met_indicator}
              readOnly
            />

            <div>
              <label htmlFor="progress_status_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Progress status date")}
              </label>
              <input
                id="progress_status_date"
                type="date"
                value={toInputDate(form.progress_status_date)}
                onChange={(e) => onChange({ progress_status_date: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={isSaving}
              />
            </div>

            <input type="hidden" value={toInputDate(form.milestone_met_date)} readOnly />

            <input
              type="hidden"
              value={form.progress_status_user_id == null ? "" : form.progress_status_user_id}
              readOnly
            />

          </div>

          {apiErrorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {apiErrorMessage}
            </div>
          ) : null}

          {validationError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
              {validationError}
            </div>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 hover:bg-violet-700"
            >
              {editingMilestone ? t("Update") : t("Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

