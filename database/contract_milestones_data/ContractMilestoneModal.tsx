"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "@/app/context/TranslationContext";
import type { ContractMilestoneData, CreateContractMilestoneInput } from "./types";

interface ContractMilestoneModalProps {
  isOpen: boolean;
  editingMilestone: ContractMilestoneData | null;
  form: CreateContractMilestoneInput;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateContractMilestoneInput>) => void;
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ContractMilestoneModal({
  isOpen,
  editingMilestone,
  form,
  isSaving,
  onClose,
  onSave,
  onChange,
}: ContractMilestoneModalProps) {
  const { t } = useTranslations();
  const [validationError, setValidationError] = useState<string | null>(null);

  const headerTitle = editingMilestone ? t("Edit milestone") : t("Add milestone");
  const headerSubtitle = editingMilestone
    ? t("Update milestone details")
    : t("Fill in milestone details");

  const formContent = useMemo(() => {
    if (!isOpen) return null;

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

      onSave();
    };

    return (
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="sticky top-0 bg-white dark:bg-slate-900 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{headerTitle}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{headerSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="milestone_amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("Milestone amount")} <span className="text-red-500">*</span>
            </label>
            <input
              id="milestone_amount"
              type="number"
              min={0}
              step="0.01"
              value={form.milestone_amount ?? ""}
              onChange={(e) =>
                onChange({
                  milestone_amount: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              required
              disabled={isSaving}
            />
          </div>

          <div>
            <label htmlFor="milestone_percentage" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("Milestone percentage")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="milestone_percentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.milestone_percentage ?? ""}
                onChange={(e) =>
                  onChange({
                    milestone_percentage: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
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
            <input
              id="progress_status"
              type="number"
              step="1"
              value={form.progress_status ?? 0}
              onChange={(e) =>
                onChange({
                  progress_status: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              disabled={isSaving}
            />
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
    );
  }, [editingMilestone, form, headerSubtitle, headerTitle, isOpen, isSaving, onChange, onClose, onSave, t, validationError]);

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
        {formContent}
      </div>
    </div>
  );
}

