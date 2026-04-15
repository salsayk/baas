"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { flushSync } from "react-dom";
import { GripVertical } from "lucide-react";
import type { Contract } from "@/database/contracts/types";
import type {
  ContractMilestoneSuccessData,
  CreateContractMilestoneSuccessInput,
} from "./types";
import { ContractSuccessMilestoneModal } from "./ContractSuccessMilestoneModal";
import { useTranslations } from "@/app/context/TranslationContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  notifyCreate: (message: string) => void;
  notifyUpdate: (message: string) => void;
  notifyDelete: (message: string) => void;
  notifyError: (message: string) => void;
}

type ParsedApiError = { message: string; field: string | null };

async function parseApiError(res: Response, fallback: string): Promise<ParsedApiError> {
  try {
    const data = (await res.json()) as { error?: unknown; details?: unknown; field?: unknown };
    const base =
      typeof data?.error === "string" && data.error.trim() !== ""
        ? data.error.trim()
        : fallback;
    const details =
      typeof data?.details === "string" && data.details.trim() !== ""
        ? ` Details: ${data.details.trim()}`
        : "";
    const field =
      typeof data?.field === "string" && data.field.trim() !== "" ? data.field.trim() : null;
    const prefix = field ? `Field "${field}": ` : "";
    return { message: `${prefix}${base}${details} (HTTP ${res.status})`, field };
  } catch {
    try {
      const text = (await res.text()).trim();
      if (text) return { message: `${text} (HTTP ${res.status})`, field: null };
    } catch {
      // ignore parse failures
    }
    return { message: `${fallback} (HTTP ${res.status})`, field: null };
  }
}

function sortBySeq(a: ContractMilestoneSuccessData, b: ContractMilestoneSuccessData): number {
  return Number(a.milestone_sequential_number) - Number(b.milestone_sequential_number);
}

function normalizeRow(m: ContractMilestoneSuccessData): ContractMilestoneSuccessData {
  return {
    ...m,
    contract_id: Number(m.contract_id),
    milestone_sequential_number: Number(m.milestone_sequential_number),
    milestone_type: Number(m.milestone_type),
    milestone_amount: m.milestone_amount == null ? null : Number(m.milestone_amount),
    milestone_percentage: m.milestone_percentage == null ? null : Number(m.milestone_percentage),
    milestone_percentage_reference_figure:
      m.milestone_percentage_reference_figure == null ? null : Number(m.milestone_percentage_reference_figure),
    min_payment_amount: m.min_payment_amount == null ? null : Number(m.min_payment_amount),
    max_payment_amount: m.max_payment_amount == null ? null : Number(m.max_payment_amount),
    progress_status: m.progress_status == null ? null : Number(m.progress_status),
    milestone_condition_met_indicator: Number(m.milestone_condition_met_indicator ?? 0),
    progress_status_user_id: m.progress_status_user_id == null ? null : Number(m.progress_status_user_id),
    milestone_met_mark_user_id:
      m.milestone_met_mark_user_id == null ? null : Number(m.milestone_met_mark_user_id),
  };
}

const defaultForm: CreateContractMilestoneSuccessInput = {
  contract_id: 0,
  milestone_sequential_number: null,
  milestone_criteria: null,
  milestone_due_date: null,
  milestone_type: 0,
  milestone_amount: null,
  milestone_percentage: null,
  milestone_percentage_reference_figure: null,
  milestone_percentage_reference_figure_description: null,
  min_payment_amount: null,
  max_payment_amount: null,
  progress_status: 0,
  milestone_condition_met_indicator: 0,
  progress_status_date: null,
  milestone_met_date: null,
  progress_status_user_id: null,
  milestone_met_mark_user_id: null,
};

export function ContractSuccessMilestonesModal({
  isOpen,
  onClose,
  contract,
  notifyCreate,
  notifyUpdate,
  notifyDelete,
  notifyError,
}: Props) {
  const { t } = useTranslations();
  const [milestones, setMilestones] = useState<ContractMilestoneSuccessData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ContractMilestoneSuccessData | null>(null);
  const [form, setForm] = useState<CreateContractMilestoneSuccessInput>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [apiFieldError, setApiFieldError] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragSourceIndexRef = useRef<number | null>(null);
  /** Forces tbody remount after optimistic reorder to prevent stale table row ordering in some browsers. */
  const [milestoneGridGeneration, setMilestoneGridGeneration] = useState(0);

  const contractId = contract ? Number(contract.contract_id) : 0;
  const sorted = useMemo(() => [...milestones].sort(sortBySeq), [milestones]);

  const fetchMilestones = useCallback(
    async (id: number) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/contract-success-milestones?contract_id=${id}&_ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch milestones");
        }
        const data = await res.json();
        setMilestones((Array.isArray(data) ? data : []).map(normalizeRow).sort(sortBySeq));
        setMilestoneGridGeneration((g) => g + 1);
      } catch (err) {
        setMilestones([]);
        notifyError(err instanceof Error ? t(err.message) : t("Failed to fetch milestones"));
      } finally {
        setIsLoading(false);
      }
    },
    [notifyError, t]
  );

  useEffect(() => {
    if (!isOpen || contractId <= 0) return;
    void fetchMilestones(contractId);
  }, [contractId, isOpen, fetchMilestones]);

  const resetMilestoneModal = useCallback(() => {
    setMilestoneModalOpen(false);
    setEditingMilestone(null);
    setForm(defaultForm);
    setApiFieldError(null);
    setApiErrorMessage(null);
    if (contractId > 0) void fetchMilestones(contractId);
  }, [contractId, fetchMilestones]);

  const openCreateModal = () => {
    setEditingMilestone(null);
    setApiFieldError(null);
    setApiErrorMessage(null);
    setForm({ ...defaultForm, contract_id: contractId, progress_status: 0, milestone_type: 0 });
    setMilestoneModalOpen(true);
  };

  const openEditModal = (m: ContractMilestoneSuccessData) => {
    setEditingMilestone(m);
    setApiFieldError(null);
    setApiErrorMessage(null);
    setForm({
      contract_id: Number(m.contract_id),
      milestone_sequential_number: Number(m.milestone_sequential_number),
      milestone_criteria: m.milestone_criteria,
      milestone_due_date: m.milestone_due_date,
      milestone_type: Number(m.milestone_type),
      milestone_amount: m.milestone_amount,
      milestone_percentage: m.milestone_percentage,
      milestone_percentage_reference_figure: m.milestone_percentage_reference_figure,
      milestone_percentage_reference_figure_description: m.milestone_percentage_reference_figure_description,
      min_payment_amount: m.min_payment_amount,
      max_payment_amount: m.max_payment_amount,
      progress_status: m.progress_status,
      milestone_condition_met_indicator: Number(m.milestone_condition_met_indicator ?? 0),
      progress_status_date: m.progress_status_date,
      milestone_met_date: m.milestone_met_date,
      progress_status_user_id: m.progress_status_user_id,
      milestone_met_mark_user_id: m.milestone_met_mark_user_id,
    });
    setMilestoneModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.contract_id) return;
    setIsSaving(true);
    try {
      if (editingMilestone) {
        const res = await fetch(
          `/api/contract-success-milestones/${editingMilestone.contract_id}/${editingMilestone.milestone_sequential_number}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          }
        );
        if (!res.ok) {
          const apiErr = await parseApiError(res, "Failed to update milestone");
          setApiFieldError(apiErr.field);
          setApiErrorMessage(apiErr.message);
          throw new Error(apiErr.message);
        }
        setApiFieldError(null);
        setApiErrorMessage(null);
        notifyUpdate(`${t("Milestone")} #${editingMilestone.milestone_sequential_number} ${t("Update")}`);
      } else {
        const res = await fetch("/api/contract-success-milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const apiErr = await parseApiError(res, "Failed to create milestone");
          setApiFieldError(apiErr.field);
          setApiErrorMessage(apiErr.message);
          throw new Error(apiErr.message);
        }
        setApiFieldError(null);
        setApiErrorMessage(null);
        notifyCreate(t("Milestone created"));
      }
      resetMilestoneModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (m: ContractMilestoneSuccessData) => {
    try {
      const res = await fetch(`/api/contract-success-milestones/${m.contract_id}/${m.milestone_sequential_number}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete milestone");
      }
      const data = (await res.json()) as { milestones?: ContractMilestoneSuccessData[] };
      if (Array.isArray(data.milestones)) {
        setMilestones(data.milestones.map(normalizeRow).sort(sortBySeq));
        setMilestoneGridGeneration((g) => g + 1);
      } else if (contractId > 0) {
        await fetchMilestones(contractId);
      }
      setDeleteConfirm(null);
      notifyDelete(t("Milestone deleted"));
    } catch (err) {
      notifyError(err instanceof Error ? t(err.message) : t("Delete failed"));
    }
  };

  const persistReorder = useCallback(
    async (orderedSeq: number[]) => {
      if (contractId <= 0 || orderedSeq.length === 0) return;
      setIsReordering(true);
      try {
        const res = await fetch("/api/contract-success-milestones/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contract_id: contractId, ordered_sequential_numbers: orderedSeq }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to reorder milestones");
        }
        const data = (await res.json()) as { milestones?: ContractMilestoneSuccessData[] };
        if (Array.isArray(data.milestones)) {
          setMilestones(data.milestones.map(normalizeRow).sort(sortBySeq));
          setMilestoneGridGeneration((g) => g + 1);
        } else {
          await fetchMilestones(contractId);
        }
      } catch (err) {
        notifyError(err instanceof Error ? t(err.message) : t("Reorder failed"));
        await fetchMilestones(contractId);
      } finally {
        setIsReordering(false);
        setDragIndex(null);
      }
    },
    [contractId, fetchMilestones, notifyError, t]
  );

  const handleDragStart = useCallback(
    (index: number) => (e: DragEvent<HTMLTableRowElement>) => {
      if (milestoneModalOpen || isReordering) {
        e.preventDefault();
        return;
      }
      dragSourceIndexRef.current = index;
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    [isReordering, milestoneModalOpen]
  );

  const handleTbodyDrop = useCallback(
    (e: DragEvent<HTMLTableSectionElement>) => {
      e.preventDefault();
      if (milestoneModalOpen || isReordering) return;
      const from = dragSourceIndexRef.current;
      if (from == null) return;
      const tr = (e.target as HTMLElement).closest("tr[data-milestone-row-index]");
      if (!tr) return;
      const dropIndex = Number(tr.getAttribute("data-milestone-row-index"));
      if (!Number.isFinite(dropIndex) || from === dropIndex) return;
      const next = [...sorted];
      const [removed] = next.splice(from, 1);
      next.splice(dropIndex, 0, removed);
      const orderedSeq = next.map((m) => Number(m.milestone_sequential_number));
      const optimisticRows = next.map((m, i) => ({
        ...m,
        milestone_sequential_number: i + 1,
      }));
      flushSync(() => {
        setMilestones(optimisticRows);
        setMilestoneGridGeneration((g) => g + 1);
      });
      dragSourceIndexRef.current = null;
      void persistReorder(orderedSeq);
    },
    [isReordering, milestoneModalOpen, persistReorder, sorted]
  );

  if (!isOpen || !contract || contractId <= 0) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full h-[92vh] sm:h-[88vh] sm:max-w-7xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {t("Configure Success Milestones")} - {contract.contract_name}
          </h3>
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
                disabled={isLoading || isReordering}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {t("Add milestone")}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="w-10 px-2 py-4" />
                    <th className="px-4 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("Milestone #")}</th>
                    <th className="px-4 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("Criteria")}</th>
                    <th className="px-4 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("Type")}</th>
                    <th className="px-4 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("Amount")}</th>
                    <th className="px-4 py-4 text-start text-xs font-semibold text-slate-500 uppercase">{t("Percentage")}</th>
                    <th className="px-4 py-4 text-end text-xs font-semibold text-slate-500 uppercase">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody
                  key={milestoneGridGeneration}
                  className="divide-y divide-slate-100 dark:divide-slate-700"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleTbodyDrop}
                >
                  {isLoading ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-500">{t("Loading milestones...")}</td></tr>
                  ) : sorted.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-500">{t("No milestones configured yet for this contract.")}</td></tr>
                  ) : (
                    sorted.map((m, index) => (
                      <tr
                        key={`${milestoneGridGeneration}-${m.contract_id}-${m.milestone_sequential_number}-${index}`}
                        data-milestone-row-index={index}
                        draggable={!milestoneModalOpen && !isReordering}
                        onDragStart={handleDragStart(index)}
                        onDragEnd={() => {
                          dragSourceIndexRef.current = null;
                          setDragIndex(null);
                        }}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${dragIndex === index ? "opacity-60" : ""}`}
                      >
                        <td className="w-10 px-2 py-4 text-slate-400"><GripVertical className="w-4 h-4" /></td>
                        <td className="px-4 py-4">{m.milestone_sequential_number}</td>
                        <td className="px-4 py-4">{m.milestone_criteria}</td>
                        <td className="px-4 py-4">{Number(m.milestone_type) === 1 ? t("Percentage") : t("Fixed")}</td>
                        <td className="px-4 py-4">{m.milestone_amount ?? "-"}</td>
                        <td className="px-4 py-4">{m.milestone_percentage == null ? "-" : `${m.milestone_percentage}%`}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => openEditModal(m)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title={t("Edit")}>✎</button>
                            {deleteConfirm === `${m.contract_id}-${m.milestone_sequential_number}` ? (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => handleDelete(m)} className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600">{t("Confirm")}</button>
                                <button type="button" onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{t("Cancel")}</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(`${m.contract_id}-${m.milestone_sequential_number}`)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                                title={t("Delete")}
                              >
                                🗑
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

      <ContractSuccessMilestoneModal
        isOpen={milestoneModalOpen}
        editingMilestone={editingMilestone}
        form={form}
        isSaving={isSaving}
        contract={contract}
        apiFieldError={apiFieldError}
        apiErrorMessage={apiErrorMessage}
        onClose={resetMilestoneModal}
        onSave={handleSave}
        onChange={(updates) => {
          if (apiFieldError || apiErrorMessage) {
            setApiFieldError(null);
            setApiErrorMessage(null);
          }
          setForm((prev) => ({ ...prev, ...updates }));
        }}
      />
    </div>
  );
}

