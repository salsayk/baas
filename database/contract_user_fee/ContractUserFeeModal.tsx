"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTranslations } from "@/app/context/TranslationContext";
import type { CreateContractUserFeeInput, ContractUserFee } from "./types";

interface LookupValue {
  value_id: number;
  value_name: string;
  base_value_name?: string;
}

interface ContractUserFeeModalProps {
  isOpen: boolean;
  editingFee: ContractUserFee | null;
  form: CreateContractUserFeeInput;
  professionalGradesFixed?: number | null;
  usedProfessionalGrades?: number[];
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateContractUserFeeInput>) => void;
}

const USER_PROFESSIONAL_GRADE_LOOKUP_ID = 3;

function normalizeLookupRows(rows: LookupValue[]): LookupValue[] {
  return rows.map((g) => ({
    ...g,
    value_id: Number(g.value_id),
  }));
}

export function ContractUserFeeModal({
  isOpen,
  editingFee,
  form,
  professionalGradesFixed,
  usedProfessionalGrades = [],
  isSaving,
  onClose,
  onSave,
  onChange,
}: ContractUserFeeModalProps) {
  const { languageId } = useLanguage();
  const { t } = useTranslations();
  const [professionalGrades, setProfessionalGrades] = useState<LookupValue[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchProfessionalGrades = useCallback(async () => {
    if (!isOpen) return;
    try {
      const params = languageId ? `&language_id=${languageId}` : "";
      const res = await fetch(`/api/system-lookup-values?lookup_table_id=${USER_PROFESSIONAL_GRADE_LOOKUP_ID}${params}`);
      const data = await res.json();
      setProfessionalGrades(Array.isArray(data) ? normalizeLookupRows(data) : []);
    } catch {
      setProfessionalGrades([]);
    }
  }, [isOpen, languageId]);

  useEffect(() => {
    fetchProfessionalGrades();
  }, [fetchProfessionalGrades]);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
  }, [isOpen]);

  const resolvedFixedGrade =
    professionalGradesFixed != null
      ? Number(professionalGradesFixed)
      : editingFee != null
        ? Number(editingFee.user_professional_grade)
        : null;

  const gradeFixed = resolvedFixedGrade != null && !Number.isNaN(resolvedFixedGrade);
  const gradeValue = gradeFixed ? resolvedFixedGrade : form.user_professional_grade ?? null;

  const usedGradeSet = useMemo(
    () => new Set(usedProfessionalGrades.map((id) => Number(id))),
    [usedProfessionalGrades]
  );

  const availableGrades = useMemo(() => {
    if (editingFee) return professionalGrades;
    return professionalGrades.filter((g) => !usedGradeSet.has(Number(g.value_id)));
  }, [editingFee, professionalGrades, usedGradeSet]);

  useEffect(() => {
    if (!isOpen || gradeFixed || editingFee) return;
    if (form.user_professional_grade != null) {
      const sel = Number(form.user_professional_grade);
      if (usedGradeSet.has(sel)) {
        const next = availableGrades[0]?.value_id ?? null;
        if (next != null) onChange({ user_professional_grade: next });
      }
      return;
    }
    if (availableGrades.length > 0) {
      const next = availableGrades[0]?.value_id ?? null;
      if (next != null) onChange({ user_professional_grade: next });
    }
  }, [availableGrades, editingFee, form.user_professional_grade, gradeFixed, isOpen, onChange, usedGradeSet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (form.user_professional_grade == null) {
      setValidationError(t("User professional grade is required"));
      return;
    }
    if (form.user_hourly_rate == null) {
      setValidationError(t("User hourly rate is required"));
      return;
    }
    if (Number(form.user_hourly_rate) < 0) {
      setValidationError(t("User hourly rate must be >= 0"));
      return;
    }
    if (form.user_hourly_rate_discount == null) {
      setValidationError(t("User hourly rate discount is required"));
      return;
    }
    if (Number(form.user_hourly_rate_discount) < 0 || Number(form.user_hourly_rate_discount) > 100) {
      setValidationError(t("User hourly rate discount must be between 0 and 100"));
      return;
    }
    onSave();
  };

  const formContent = useMemo(() => {
    if (!isOpen) return null;
    return (
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="sticky top-0 bg-white dark:bg-slate-900 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {editingFee ? t("Edit User Contract fee") : t("Add User Contract fee")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {editingFee ? t("Update user contract fee details") : t("Fill in user contract fee details")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="user_professional_grade" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("User Professional Grade")} <span className="text-red-500">*</span>
            </label>
            <select
              id="user_professional_grade"
              value={gradeValue === null || gradeValue === undefined ? "" : String(gradeValue)}
              onChange={(e) => {
                const raw = e.target.value;
                onChange({
                  user_professional_grade: raw === "" ? null : Number(raw),
                });
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              required
              disabled={isSaving || gradeFixed}
            >
              <option value="">{t("Select grade")}</option>
              {availableGrades.map((g) => (
                <option key={g.value_id} value={g.value_id}>
                  {g.value_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="user_hourly_rate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("User hourly rate")} <span className="text-red-500">*</span>
            </label>
            <input
              id="user_hourly_rate"
              type="number"
              min={0}
              step="0.01"
              value={form.user_hourly_rate ?? 0}
              onChange={(e) => onChange({ user_hourly_rate: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              required
              disabled={isSaving}
            />
          </div>

          <div>
            <label htmlFor="user_hourly_rate_discount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("User hourly rate discount")} <span className="text-red-500">*</span>
              <span className="ml-2 text-slate-400 text-xs">(0-100)</span>
            </label>
            <div className="relative">
              <input
                id="user_hourly_rate_discount"
                type="number"
                min={0}
                max={100}
                step="1"
                value={form.user_hourly_rate_discount ?? 0}
                onChange={(e) =>
                  onChange({
                    user_hourly_rate_discount: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full pr-10 px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                required
                disabled={isSaving}
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 select-none">%</span>
            </div>
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
              form.user_professional_grade == null ||
              form.user_hourly_rate == null ||
              form.user_hourly_rate_discount == null
            }
            className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 hover:bg-violet-700"
          >
            {editingFee ? t("Update") : t("Create")}
          </button>
        </div>
      </form>
    );
  }, [editingFee, fetchProfessionalGrades, form, gradeFixed, gradeValue, isOpen, isSaving, onChange, onClose, onSave, professionalGrades, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-y-auto overflow-x-hidden">
        {formContent}
      </div>
    </div>
  );
}

