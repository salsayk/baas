"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "@/app/context/TranslationContext";
import type { Project } from "@/database/project/types";
import type { Contract } from "@/database/contracts/types";

interface EntityPair {
  pair_id: number;
  entities_pair_type: number;
  parent_entity_id: number;
  child_entity_id: number;
  sort_order: number;
}

interface AssignContractsModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}

interface ContractItem {
  contract: Contract;
  selected: boolean;
  sortOrder: number;
}

function reorderSelected(items: ContractItem[]): ContractItem[] {
  const selected = items.filter((i) => i.selected);
  const unselected = items.filter((i) => !i.selected);
  selected.sort((a, b) => a.sortOrder - b.sortOrder);
  selected.forEach((s, i) => {
    s.sortOrder = i;
  });
  return [...selected, ...unselected];
}

export function AssignContractsModal({
  isOpen,
  project,
  onClose,
  onSaved,
}: AssignContractsModalProps) {
  const { t } = useTranslations();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [existingPairs, setExistingPairs] = useState<EntityPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!project || !isOpen) return;
    setIsLoading(true);
    setError(null);
    try {
      const [contractsRes, pairsRes] = await Promise.all([
        fetch(
          `/api/contracts?service_office_id=${project.service_office_id}&customer_id=${project.customer_id}`
        ),
        fetch(
          `/api/entities-pairs?parent_entity_id=${project.project_id}&entities_pair_type=0`
        ),
      ]);
      if (!contractsRes.ok) throw new Error("Failed to fetch contracts");
      if (!pairsRes.ok) throw new Error("Failed to fetch assignments");
      const contractsData = await contractsRes.json();
      const pairsData = await pairsRes.json();
      const contractList = Array.isArray(contractsData) ? contractsData : [];
      const pairs = Array.isArray(pairsData) ? pairsData : [];

      setContracts(contractList);
      setExistingPairs(pairs);

      const pairMap = new Map(pairs.map((p) => [p.child_entity_id, p.sort_order]));
      const initialItems: ContractItem[] = contractList.map((c, idx) => {
        const order = pairMap.has(c.contract_id) ? pairMap.get(c.contract_id)! : idx;
        return {
          contract: c,
          selected: pairMap.has(c.contract_id),
          sortOrder: order,
        };
      });
      setItems(reorderSelected(initialItems));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setContracts([]);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [project, isOpen]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelected = (contractId: number) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.contract.contract_id === contractId
          ? { ...i, selected: !i.selected, sortOrder: i.selected ? i.sortOrder : prev.filter((x) => x.selected).length }
          : i
      );
      return reorderSelected(next);
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const item = items[index];
    if (!item.selected) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const item = items[index];
    if (!item.selected) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    setDraggedIndex(null);
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIndex) || fromIndex === dropIndex) return;
    const from = items[fromIndex];
    const to = items[dropIndex];
    if (!from.selected || !to.selected) return;

    setItems((prev) => {
      const selected = prev.filter((i) => i.selected);
      const fromSelIdx = selected.findIndex((s) => s.contract.contract_id === from.contract.contract_id);
      const toSelIdx = selected.findIndex((s) => s.contract.contract_id === to.contract.contract_id);
      if (fromSelIdx === -1 || toSelIdx === -1) return prev;
      const reordered = [...selected];
      const [removed] = reordered.splice(fromSelIdx, 1);
      const insertIdx = fromSelIdx < toSelIdx ? toSelIdx - 1 : toSelIdx;
      reordered.splice(insertIdx, 0, removed);
      const withOrder = reordered.map((r, i) => ({ ...r, sortOrder: i }));
      const unselected = prev.filter((i) => !i.selected);
      return [...withOrder, ...unselected];
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    if (!project) return;
    const selected = items.filter((i) => i.selected);
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/entities-pairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.project_id,
          assignments: selected.map((s, i) => ({
            contract_id: s.contract.contract_id,
            sort_order: i,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t("Assign Contracts")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("Select contracts for")} &quot;{project?.project_name}&quot; {t("and drag to reorder")}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {isLoading ? (
            <p className="py-8 text-center text-slate-500">{t("Loading contracts...")}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              {t("No contracts for this customer")}
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((item, index) => (
                <li
                  key={item.contract.contract_id}
                  draggable={item.selected}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    item.selected
                      ? "border-violet-200 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/20 cursor-grab active:cursor-grabbing"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30"
                  } ${dragOverIndex === index ? "ring-2 ring-violet-400" : ""} ${draggedIndex === index ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelected(item.contract.contract_id)}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  {item.selected && (
                    <span className="text-slate-400 text-sm w-5" title="Drag to reorder">
                      ⋮⋮
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.contract.contract_name}
                    </p>
                    {item.contract.contract_description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {item.contract.contract_description}
                      </p>
                    )}
                  </div>
                  {item.selected && (
                    <span className="text-xs text-slate-400">Order: {item.sortOrder + 1}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sticky bottom-0 p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading || !items.some((i) => i.selected)}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {isSaving ? t("Saving...") : t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
