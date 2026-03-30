"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contract } from "@/database/contracts/types";
import type { ContractUserFee, CreateContractUserFeeInput } from "@/database/contract_user_fee/types";
import { ContractUserFeeModal } from "@/database/contract_user_fee/ContractUserFeeModal";
import { useTranslations } from "@/app/context/TranslationContext";
import { useLanguage } from "@/app/context/LanguageContext";

interface LookupValue {
  value_id: number;
  value_name: string;
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

export interface ContractHourlyFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  /** When API row omits name, use wizard/form title (e.g. right after create). */
  contractNameFallback?: string;
  /** Use parent notifications so toasts appear in the main page container. */
  notifyCreate: (message: string) => void;
  notifyUpdate: (message: string) => void;
  notifyDelete: (message: string) => void;
  notifyError: (message: string) => void;
}

/** Modal to manage contract user hourly fees (per professional grade) for a single contract. */
export function ContractHourlyFeeModal({
  isOpen,
  onClose,
  contract,
  contractNameFallback = "",
  notifyCreate,
  notifyUpdate,
  notifyDelete,
  notifyError,
}: ContractHourlyFeeModalProps) {
  const { t } = useTranslations();
  const { languageId } = useLanguage();

  const [professionalGrades, setProfessionalGrades] = useState<LookupValue[]>([]);
  const [fees, setFees] = useState<ContractUserFee[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ContractUserFee | null>(null);
  const [form, setForm] = useState<CreateContractUserFeeInput>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  const contractId = contract ? Number(contract.contract_id) : 0;
  const displayContractName = (contract?.contract_name ?? "").trim() || contractNameFallback.trim();

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

  const fetchFees = useCallback(
    async (id: number) => {
      setIsLoadingFees(true);
      try {
        const res = await fetch(`/api/contract-user-fee?contract_id=${id}&_ts=${Date.now()}`, { cache: "no-store" });
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
    },
    [notifyError, t]
  );

  useEffect(() => {
    if (!isOpen || !contract || !Number.isFinite(contractId) || contractId <= 0) return;
    fetchProfessionalGrades();
    fetchFees(contractId);
  }, [contract, contractId, fetchFees, fetchProfessionalGrades, isOpen]);

  useEffect(() => {
    if (!isOpen) setDeleteConfirm(null);
  }, [isOpen]);

  const handleFormChange = useCallback((updates: Partial<CreateContractUserFeeInput>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFeeModal = () => {
    setFeeModalOpen(false);
    setEditingFee(null);
    setForm(defaultForm);
  };

  const openCreateModal = () => {
    const used = new Set(fees.map((f) => Number(f.user_professional_grade)));
    const defaultGrade = professionalGrades.find((g) => !used.has(Number(g.value_id)))?.value_id ?? null;
    setEditingFee(null);
    setForm({
      ...defaultForm,
      contract_id: contractId,
      user_professional_grade: defaultGrade,
      user_hourly_rate: 0,
      user_hourly_rate_discount: 0,
    });
    setFeeModalOpen(true);
  };

  const openEditModal = (fee: ContractUserFee) => {
    setEditingFee(fee);
    setForm({
      contract_id: Number(fee.contract_id),
      user_professional_grade: Number(fee.user_professional_grade),
      user_hourly_rate: Number(fee.user_hourly_rate),
      user_hourly_rate_discount: Number(fee.user_hourly_rate_discount),
    });
    setFeeModalOpen(true);
  };

  const getGradeName = (gradeId: number | string) => {
    const id = Number(gradeId);
    const g = professionalGrades.find((x) => Number(x.value_id) === id);
    if (!g) return String(gradeId);
    return g.value_name ?? g.base_value_name ?? String(gradeId);
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
        resetFeeModal();
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
        resetFeeModal();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      notifyError(t(msg));
    } finally {
      setIsSaving(false);
    }
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
      setFees((prev) =>
        prev.filter((x) => !(x.contract_id === fee.contract_id && x.user_professional_grade === fee.user_professional_grade))
      );
      setDeleteConfirm(null);
      notifyDelete(`"${getGradeName(fee.user_professional_grade)}" ${t("Delete")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      notifyError(t(msg));
    }
  };

  if (!isOpen || !contract || !Number.isFinite(contractId) || contractId <= 0) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full h-[92vh] sm:h-[88vh] sm:max-w-4xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {t("Hourly contract fee configuration")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {t("Contract")}: {displayContractName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t("Close")}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={openCreateModal}
                disabled={
                  isLoadingFees ||
                  professionalGrades.filter((g) => !fees.some((f) => Number(f.user_professional_grade) === Number(g.value_id)))
                    .length === 0
                }
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {t("Add User Contract fee")}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("User Professional Grade")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("User hourly rate")}</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("User hourly rate discount")} %
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {isLoadingFees ? (
                    <tr>
                      <td colSpan={4} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("Loading fees...")}
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
                      <tr key={`${fee.contract_id}-${fee.user_professional_grade}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                          {getGradeName(fee.user_professional_grade)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{fee.user_hourly_rate}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{fee.user_hourly_rate_discount}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(fee)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                              title={t("Edit")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </button>
                            {deleteConfirm === `${fee.contract_id}-${fee.user_professional_grade}` ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(fee)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600"
                                >
                                  {t("Confirm")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600"
                                >
                                  {t("Cancel")}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(`${fee.contract_id}-${fee.user_professional_grade}`)}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
                                title={t("Delete")}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </div>

      <ContractUserFeeModal
        isOpen={feeModalOpen}
        editingFee={editingFee}
        form={form}
        usedProfessionalGrades={fees.map((f) => Number(f.user_professional_grade))}
        isSaving={isSaving}
        onClose={resetFeeModal}
        onSave={handleSave}
        onChange={handleFormChange}
      />
    </div>
  );
}
