"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTranslations } from "@/app/context/TranslationContext";
import type { Contract } from "@/database/contracts/types";
import type { ContractMilestoneData, CreateContractMilestoneInput } from "./types";
import {
  computeTotalsAfterMilestoneChange,
  getMilestoneAggregateViolation,
} from "@/app/lib/contract-milestones-aggregate-validation";

interface ContractMilestoneModalProps {
  isOpen: boolean;
  editingMilestone: ContractMilestoneData | null;
  form: CreateContractMilestoneInput;
  isSaving: boolean;
  /** Used to enforce total amount / percentage caps vs other milestones */
  contract: Contract | null;
  existingMilestones: ContractMilestoneData[];
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateContractMilestoneInput>) => void;
}

interface LookupValue {
  value_id: number;
  value_name: string;
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundPct(n: number): number {
  return Math.round(n * 100) / 100;
}

export function ContractMilestoneModal({
  isOpen,
  editingMilestone,
  form,
  isSaving,
  contract,
  existingMilestones,
  onClose,
  onSave,
  onChange,
}: ContractMilestoneModalProps) {
  const { t } = useTranslations();
  const { languageId } = useLanguage();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progressStatusOptions, setProgressStatusOptions] = useState<LookupValue[]>([]);
  /** When false, do not render the progress status dropdown yet — avoids showing raw "0" before Hebrew labels load. */
  const [progressStatusLookupReady, setProgressStatusLookupReady] = useState(false);

  const headerTitle = editingMilestone ? t("Edit milestone") : t("Add milestone");
  const headerSubtitle = editingMilestone
    ? t("Update milestone details")
    : t("Fill in milestone details");

  /** Positive contract total: enables amount ↔ percentage sync */
  const contractAmountCap = useMemo(() => {
    const v = contract?.contract_amount_value;
    if (v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }, [contract]);

  /** Unallocated room vs contract amount cap and vs 100% total, given current form and other milestones. */
  const allocationRemaining = useMemo(() => {
    const amt =
      form.milestone_amount != null && Number.isFinite(Number(form.milestone_amount))
        ? Number(form.milestone_amount)
        : 0;
    const pct =
      form.milestone_percentage != null && Number.isFinite(Number(form.milestone_percentage))
        ? Number(form.milestone_percentage)
        : 0;

    const { totalAmount, totalPct } = computeTotalsAfterMilestoneChange(
      existingMilestones,
      editingMilestone
        ? {
            contract_id: Number(editingMilestone.contract_id),
            milestone_sequential_number: Number(editingMilestone.milestone_sequential_number),
          }
        : null,
      amt,
      pct
    );

    const amountLeft =
      contractAmountCap != null ? Math.max(0, roundMoney(contractAmountCap - totalAmount)) : null;
    const pctLeft = Math.max(0, roundPct(100 - totalPct));

    return { amountLeft, pctLeft, totalAmount, totalPct };
  }, [
    contractAmountCap,
    existingMilestones,
    editingMilestone,
    form.milestone_amount,
    form.milestone_percentage,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setProgressStatusOptions([]);
      setProgressStatusLookupReady(false);
      return;
    }

    let cancelled = false;
    setProgressStatusLookupReady(false);

    (async () => {
      try {
        const params = languageId ? `&language_id=${languageId}` : "";
        const res = await fetch(`/api/system-lookup-values?lookup_table_id=15${params}`);
        if (cancelled) return;
        if (!res.ok) {
          setProgressStatusOptions([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setProgressStatusOptions(
          list
            .map((row) => ({
              value_id: Number(row.value_id),
              value_name: String(row.value_name ?? ""),
            }))
            .filter((row) => Number.isFinite(row.value_id))
        );
      } catch {
        if (!cancelled) setProgressStatusOptions([]);
      } finally {
        if (!cancelled) setProgressStatusLookupReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, languageId]);

  useEffect(() => {
    if (!isOpen) setValidationError(null);
  }, [isOpen]);

  /**
   * After lookup has loaded: if DB value is not in lookup 15, show a numeric fallback.
   * While loading, we do not inject a synthetic row (that caused "0" to flash instead of Hebrew).
   */
  const progressStatusSelectOptions = useMemo(() => {
    const pid = form.progress_status;
    if (pid == null || !Number.isFinite(Number(pid))) return progressStatusOptions;
    const n = Number(pid);
    if (progressStatusOptions.some((o) => o.value_id === n)) return progressStatusOptions;
    if (!progressStatusLookupReady) return progressStatusOptions;
    return [...progressStatusOptions, { value_id: n, value_name: String(n) }];
  }, [form.progress_status, progressStatusLookupReady, progressStatusOptions]);

  const handleMilestoneAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValidationError(null);
      const raw = e.target.value;
      if (raw === "") {
        if (contractAmountCap != null) {
          onChange({ milestone_amount: null, milestone_percentage: null });
        } else {
          onChange({ milestone_amount: null });
        }
        return;
      }
      const amt = Number(raw);
      if (!Number.isFinite(amt)) return;
      if (contractAmountCap != null) {
        const pct = (amt / contractAmountCap) * 100;
        onChange({
          milestone_amount: roundMoney(amt),
          milestone_percentage: roundPct(pct),
        });
      } else {
        onChange({ milestone_amount: roundMoney(amt) });
      }
    },
    [contractAmountCap, onChange]
  );

  const handleMilestonePercentageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValidationError(null);
      const raw = e.target.value;
      if (raw === "") {
        if (contractAmountCap != null) {
          onChange({ milestone_amount: null, milestone_percentage: null });
        } else {
          onChange({ milestone_percentage: null });
        }
        return;
      }
      const pct = Number(raw);
      if (!Number.isFinite(pct)) return;
      if (contractAmountCap != null) {
        const amt = (pct / 100) * contractAmountCap;
        onChange({
          milestone_percentage: roundPct(pct),
          milestone_amount: roundMoney(amt),
        });
      } else {
        onChange({ milestone_percentage: roundPct(pct) });
      }
    },
    [contractAmountCap, onChange]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (form.milestone_amount == null || Number.isNaN(Number(form.milestone_amount))) {
      setValidationError(t("Milestone amount is required"));
      return;
    }

    if (form.milestone_percentage == null || Number.isNaN(Number(form.milestone_percentage))) {
      setValidationError(t("Milestone percentage is required"));
      return;
    }

    const percentage = Number(form.milestone_percentage);
    if (percentage < 0 || percentage > 100) {
      setValidationError(t("Milestone percentage must be between 0 and 100"));
      return;
    }

    if (contract) {
      const amt = Number(form.milestone_amount);
      const { totalAmount, totalPct } = computeTotalsAfterMilestoneChange(
        existingMilestones,
        editingMilestone
          ? {
              contract_id: Number(editingMilestone.contract_id),
              milestone_sequential_number: Number(editingMilestone.milestone_sequential_number),
            }
          : null,
        amt,
        percentage
      );
      const violation = getMilestoneAggregateViolation({
        contractAmountValue: contract.contract_amount_value,
        totalMilestoneAmount: totalAmount,
        totalMilestonePercentage: totalPct,
      });
      if (violation) {
        if (violation.kind === "amount") {
          setValidationError(
            `${t("Total milestone amounts cannot exceed the contract amount.")} (${violation.totalAmount.toFixed(2)} / ${violation.cap.toFixed(2)})`
          );
        } else {
          setValidationError(
            `${t("Total milestone percentages cannot exceed 100%.")} (${violation.totalPct.toFixed(2)}%)`
          );
        }
        return;
      }
    }

    onSave();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-4xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-y-auto overflow-x-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="sticky top-0 bg-white dark:bg-slate-900 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{headerTitle}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{headerSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="milestone_amount"
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                <span>
                  {t("Milestone amount")} <span className="text-red-500">*</span>
                </span>
                {contractAmountCap != null ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-normal text-slate-500 dark:text-slate-400"
                    title={t(
                      "Shows how much of the contract amount is still unallocated after all milestones including this one."
                    )}
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span>
                      {t("Remaining")}: {allocationRemaining.amountLeft?.toFixed(2)}{" "}
                      {(contract?.contract_currency ?? "").trim()}
                    </span>
                  </span>
                ) : null}
              </label>
              <input
                id="milestone_amount"
                type="number"
                min={0}
                step="0.01"
                value={form.milestone_amount ?? ""}
                onChange={handleMilestoneAmountChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                required
                disabled={isSaving}
              />
              {contractAmountCap != null ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("Amount and percentage stay in sync with the contract total.")}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="milestone_percentage"
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                <span>
                  {t("Milestone percentage")} <span className="text-red-500">*</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-normal text-slate-500 dark:text-slate-400"
                  title={t(
                    "Shows how many percentage points are still available across all milestones (maximum 100% in total)."
                  )}
                >
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    {t("Remaining")}: {allocationRemaining.pctLeft.toFixed(2)}%
                  </span>
                </span>
              </label>
              <div className="relative">
                <input
                  id="milestone_percentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.milestone_percentage ?? ""}
                  onChange={handleMilestonePercentageChange}
                  className="w-full pr-10 px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  required
                  disabled={isSaving}
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 select-none">%</span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="milestone_criteria" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Milestone criteria")}
              </label>
              <textarea
                id="milestone_criteria"
                maxLength={200}
                value={form.milestone_criteria ?? ""}
                onChange={(e) =>
                  onChange({
                    milestone_criteria: e.target.value === "" ? null : e.target.value,
                  })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                rows={3}
                disabled={isSaving}
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
                onChange={(e) =>
                  onChange({
                    milestone_due_date: e.target.value || null,
                  })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="progress_status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Progress status")}
              </label>
              {!progressStatusLookupReady ? (
                <div
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-sm"
                  aria-busy="true"
                >
                  {t("Loading...")}
                </div>
              ) : (
                <select
                  id="progress_status"
                  value={form.progress_status == null ? "" : String(form.progress_status)}
                  onChange={(e) =>
                    onChange({
                      progress_status: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  disabled={isSaving}
                >
                  <option value="">{t("Select progress status")}</option>
                  {progressStatusSelectOptions.map((status) => (
                    <option key={status.value_id} value={status.value_id}>
                      {status.value_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="progress_status_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Progress status date")}
              </label>
              <input
                id="progress_status_date"
                type="date"
                value={toInputDate(form.progress_status_date)}
                onChange={(e) => onChange({ progress_status_date: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="progress_status_user_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("Progress status user id")}
              </label>
              <input
                id="progress_status_user_id"
                type="number"
                step="1"
                value={form.progress_status_user_id ?? ""}
                onChange={(e) =>
                  onChange({
                    progress_status_user_id: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                disabled={isSaving}
              />
            </div>
          </div>

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
              disabled={
                isSaving ||
                form.milestone_amount == null ||
                form.milestone_percentage == null
              }
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
