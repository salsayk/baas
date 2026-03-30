"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contract } from "@/database/contracts/types";
import type { ContractMilestoneData, CreateContractMilestoneInput } from "./types";
import { ContractMilestoneModal } from "./ContractMilestoneModal";
import { useTranslations } from "@/app/context/TranslationContext";

/** Hidden from UI; always sent on create/update (DB defaults). */
const MILESTONE_MET_FIELD_DEFAULTS = {
  milestone_condition_met_indicator: 0,
  milestone_met_date: null as string | null,
  milestone_met_mark_user_id: null as number | null,
};

const defaultForm: CreateContractMilestoneInput = {
  contract_id: 0,
  milestone_sequential_number: null,
  milestone_criteria: null,
  milestone_due_date: null,
  milestone_amount: null,
  milestone_percentage: null,
  progress_status: 0,
  milestone_condition_met_indicator: MILESTONE_MET_FIELD_DEFAULTS.milestone_condition_met_indicator,
  progress_status_date: null,
  milestone_met_date: MILESTONE_MET_FIELD_DEFAULTS.milestone_met_date,
  progress_status_user_id: null,
  milestone_met_mark_user_id: MILESTONE_MET_FIELD_DEFAULTS.milestone_met_mark_user_id,
};

interface ContractMilestonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  notifyCreate: (message: string) => void;
  notifyUpdate: (message: string) => void;
  notifyDelete: (message: string) => void;
  notifyError: (message: string) => void;
}

function toDateDisplay(value: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

export function ContractMilestonesModal({
  isOpen,
  onClose,
  contract,
  notifyCreate,
  notifyUpdate,
  notifyDelete,
  notifyError,
}: ContractMilestonesModalProps) {
  const { t } = useTranslations();
  const [milestones, setMilestones] = useState<ContractMilestoneData[]>([]);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ContractMilestoneData | null>(null);
  const [form, setForm] = useState<CreateContractMilestoneInput>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  const contractId = contract ? Number(contract.contract_id) : 0;
  const contractName = contract?.contract_name ?? "";

  const fetchMilestones = useCallback(
    async (id: number) => {
      setIsLoadingMilestones(true);
      try {
        const res = await fetch(`/api/contract-milestones?contract_id=${id}&_ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch milestones");
        }
        const data = await res.json();
        setMilestones(Array.isArray(data) ? data : []);
      } catch (err) {
        setMilestones([]);
        const msg = err instanceof Error ? err.message : "Failed to fetch milestones";
        notifyError(t(msg));
      } finally {
        setIsLoadingMilestones(false);
      }
    },
    [notifyError, t]
  );

  useEffect(() => {
    if (!isOpen || !contract || !Number.isFinite(contractId) || contractId <= 0) return;
    fetchMilestones(contractId);
  }, [contract, contractId, fetchMilestones, isOpen]);

  useEffect(() => {
    if (!isOpen) setDeleteConfirm(null);
  }, [isOpen]);

  const handleFormChange = useCallback((updates: Partial<CreateContractMilestoneInput>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetMilestoneModal = () => {
    setMilestoneModalOpen(false);
    setEditingMilestone(null);
    setForm(defaultForm);
  };

  const openCreateModal = () => {
    setEditingMilestone(null);
    setForm({
      ...defaultForm,
      contract_id: contractId,
      milestone_sequential_number: null,
      progress_status: 0,
    });
    setMilestoneModalOpen(true);
  };

  const openEditModal = (milestone: ContractMilestoneData) => {
    setEditingMilestone(milestone);
    setForm({
      contract_id: Number(milestone.contract_id),
      milestone_sequential_number: Number(milestone.milestone_sequential_number),
      milestone_criteria: milestone.milestone_criteria,
      milestone_due_date: milestone.milestone_due_date,
      milestone_amount: Number(milestone.milestone_amount),
      milestone_percentage: Number(milestone.milestone_percentage),
      progress_status: Number(milestone.progress_status),
      progress_status_date: milestone.progress_status_date,
      progress_status_user_id: milestone.progress_status_user_id == null ? null : Number(milestone.progress_status_user_id),
      ...MILESTONE_MET_FIELD_DEFAULTS,
    });
    setMilestoneModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.contract_id) return;
    if (form.milestone_amount == null || form.milestone_percentage == null) return;

    setIsSaving(true);
    try {
      if (editingMilestone) {
        const res = await fetch(
          `/api/contract-milestones/${editingMilestone.contract_id}/${editingMilestone.milestone_sequential_number}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              milestone_criteria: form.milestone_criteria,
              milestone_due_date: form.milestone_due_date,
              milestone_amount: form.milestone_amount,
              milestone_percentage: form.milestone_percentage,
              progress_status: form.progress_status,
              progress_status_date: form.progress_status_date,
              progress_status_user_id: form.progress_status_user_id,
              ...MILESTONE_MET_FIELD_DEFAULTS,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update milestone");
        }
        const updated = (await res.json()) as ContractMilestoneData;
        setMilestones((prev) =>
          prev.map((m) =>
            Number(m.contract_id) === Number(updated.contract_id) &&
            Number(m.milestone_sequential_number) === Number(updated.milestone_sequential_number)
              ? updated
              : m
          )
        );
        notifyUpdate(`${t("Milestone")} #${updated.milestone_sequential_number} ${t("Update")}`);
      } else {
        const res = await fetch("/api/contract-milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            ...MILESTONE_MET_FIELD_DEFAULTS,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create milestone");
        }
        const created = (await res.json()) as ContractMilestoneData;
        setMilestones((prev) =>
          [...prev, created].sort(
            (a, b) => Number(a.milestone_sequential_number) - Number(b.milestone_sequential_number)
          )
        );
        notifyCreate(`${t("Milestone")} #${created.milestone_sequential_number} ${t("Create")}`);
      }
      resetMilestoneModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      notifyError(t(msg));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (milestone: ContractMilestoneData) => {
    try {
      const res = await fetch(
        `/api/contract-milestones/${milestone.contract_id}/${milestone.milestone_sequential_number}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete milestone");
      }
      setMilestones((prev) =>
        prev.filter(
          (m) =>
            !(
              Number(m.contract_id) === Number(milestone.contract_id) &&
              Number(m.milestone_sequential_number) === Number(milestone.milestone_sequential_number)
            )
        )
      );
      setDeleteConfirm(null);
      notifyDelete(`${t("Milestone")} #${milestone.milestone_sequential_number} ${t("Delete")}`);
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
      <div className="relative w-full h-[92vh] sm:h-[88vh] sm:max-w-6xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {t("Configure Milestones")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {t("Contract")}: {contractName}
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
                disabled={isLoadingMilestones}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {t("Add milestone")}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("Milestone #")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("Milestone criteria")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("Milestone due date")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("Milestone amount")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">
                      {t("Milestone percentage")}
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">
                      {t("Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {isLoadingMilestones ? (
                    <tr>
                      <td colSpan={6} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("Loading milestones...")}
                      </td>
                    </tr>
                  ) : milestones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("No milestones configured yet for this contract.")}
                      </td>
                    </tr>
                  ) : (
                    milestones.map((milestone) => (
                      <tr
                        key={`${milestone.contract_id}-${milestone.milestone_sequential_number}`}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                          {milestone.milestone_sequential_number}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {milestone.milestone_criteria ?? "-"}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {toDateDisplay(milestone.milestone_due_date)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {milestone.milestone_amount}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {milestone.milestone_percentage}%
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(milestone)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                              title={t("Edit")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </button>
                            {deleteConfirm === `${milestone.contract_id}-${milestone.milestone_sequential_number}` ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(milestone)}
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
                                onClick={() =>
                                  setDeleteConfirm(
                                    `${milestone.contract_id}-${milestone.milestone_sequential_number}`
                                  )
                                }
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

      <ContractMilestoneModal
        isOpen={milestoneModalOpen}
        editingMilestone={editingMilestone}
        form={form}
        isSaving={isSaving}
        onClose={resetMilestoneModal}
        onSave={handleSave}
        onChange={handleFormChange}
      />
    </div>
  );
}

