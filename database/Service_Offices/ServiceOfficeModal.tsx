"use client";

import { useTranslations } from "@/app/context/TranslationContext";
import type { ServiceOffice, CreateServiceOfficeInput } from "@/database/Service_Offices/types";
import { COUNTRIES } from "@/database/Service_Offices/countries";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

interface ServiceOfficeModalProps {
  isOpen: boolean;
  editingOffice: ServiceOffice | null;
  form: CreateServiceOfficeInput & { status: number };
  accounts: { account_id: number; account_name: string }[];
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateServiceOfficeInput & { status: number }>) => void;
  /** When set, account is fixed (e.g. opened from account row). Field is hidden and value auto-selected. */
  fixedAccountId?: number | null;
  fixedAccountName?: string;
  /** When true, render form content only (no modal overlay, no action buttons). Used in wizards. */
  embedded?: boolean;
}

export function ServiceOfficeModal({
  isOpen,
  editingOffice,
  form,
  accounts,
  isSaving,
  onClose,
  onSave,
  onChange,
  fixedAccountId,
  fixedAccountName,
  embedded = false,
}: ServiceOfficeModalProps) {
  const { t } = useTranslations();
  if (!isOpen) return null;

  const accountFixed =
    (fixedAccountId != null && fixedAccountId > 0) || (!!fixedAccountName && fixedAccountName.trim() !== "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (embedded) return;
    onSave();
  };

  const formContent = (
    <form onSubmit={handleSubmit} className={embedded ? "space-y-5" : "p-6 space-y-5"}>
          <div>
            <label htmlFor="service_office_name" className="block text-sm font-medium text-slate-700 mb-2">
              {t("Service Office Name")} <span className="text-red-500">*</span>
            </label>
            <input
              id="service_office_name"
              type="text"
              maxLength={100}
              value={form.service_office_name ?? ""}
              onChange={(e) => onChange({ service_office_name: e.target.value })}
              placeholder="e.g. Downtown Branch"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              required
              disabled={isSaving}
            />
          </div>

          <div>
            <label htmlFor="service_office_description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <input
              id="service_office_description"
              type="text"
              maxLength={100}
              value={form.service_office_description ?? ""}
              onChange={(e) => onChange({ service_office_description: e.target.value || null })}
              placeholder="Short description"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              disabled={isSaving}
            />
          </div>

          {!accountFixed && (
            <div>
              <label htmlFor="account_id" className="block text-sm font-medium text-slate-700 mb-2">
                {t("Account")} <span className="text-red-500">*</span>
              </label>
              <select
                id="account_id"
                value={form.account_id && form.account_id > 0 ? form.account_id : ""}
                onChange={(e) => onChange({ account_id: e.target.value ? parseInt(e.target.value, 10) : 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                required
                disabled={isSaving || !!editingOffice}
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_name}
                  </option>
                ))}
              </select>
              {editingOffice && (
                <p className="mt-1 text-xs text-slate-500">{t("Account cannot be changed when editing.")}</p>
              )}
            </div>
          )}
          {accountFixed && fixedAccountName && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Account</p>
              <p className="text-slate-900 font-medium">{fixedAccountName}</p>
            </div>
          )}

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-2">
              {t("Country")}
            </label>
            <select
              id="country"
              value={form.country ?? ""}
              onChange={(e) => onChange({ country: e.target.value || null })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              disabled={isSaving}
            >
              <option value="">— Select country —</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div id="service_office_status" tabIndex={-1}>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("Status")}</h3>
            <div className="flex gap-3">
              {([1, 2] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ status: s })}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
                    form.status === s
                      ? s === 1
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-400 bg-slate-100 text-slate-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {!embedded && (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={!form.service_office_name?.trim() || (!accountFixed && (!form.account_id || form.account_id < 1)) || isSaving}
                className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {editingOffice ? "Update" : "Create"}
              </button>
            </div>
          )}
        </form>
  );

  if (embedded) return formContent;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {editingOffice ? t("Edit Service Office") : t("Add Service Office")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingOffice
              ? t("Update the service office details")
              : t("Fill in the details for the new service office")}
          </p>
        </div>
        {formContent}
      </div>
    </div>
  );
}

