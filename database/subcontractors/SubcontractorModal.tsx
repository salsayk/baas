"use client";

import type { CreateSubcontractorInput, Subcontractor } from "@/database/subcontractors/types";
import { useTranslations } from "@/app/context/TranslationContext";

interface ServiceOfficeOption {
  service_office_id: number;
  service_office_name: string;
}

interface SubcontractorModalProps {
  isOpen: boolean;
  editingSubcontractor: Subcontractor | null;
  form: CreateSubcontractorInput & { status: number };
  serviceOffices: ServiceOfficeOption[];
  isSaving: boolean;
  fixedServiceOfficeId?: number | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateSubcontractorInput & { status: number }>) => void;
}

export function SubcontractorModal({
  isOpen,
  editingSubcontractor,
  form,
  serviceOffices,
  isSaving,
  fixedServiceOfficeId,
  onClose,
  onSave,
  onChange,
}: SubcontractorModalProps) {
  if (!isOpen) return null;

  const { t } = useTranslations();
  const serviceOfficeFixed = fixedServiceOfficeId != null && fixedServiceOfficeId > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {editingSubcontractor ? t("Edit Subcontractor") : t("Add Subcontractor")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingSubcontractor
              ? t("Update subcontractor details")
              : t("Fill in details for the new subcontractor")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="subcontractor_name" className="block text-sm font-medium text-slate-700 mb-2">
                {t("Subcontractor Name")} <span className="text-red-500">*</span>
              </label>
              <input
                id="subcontractor_name"
                type="text"
                maxLength={100}
                value={form.subcontractor_name ?? ""}
                onChange={(e) => onChange({ subcontractor_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                required
                disabled={isSaving}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="service_office_id" className="block text-sm font-medium text-slate-700 mb-2">
                {t("Service Office")} <span className="text-red-500">*</span>
              </label>
              <select
                id="service_office_id"
                value={form.service_office_id && form.service_office_id > 0 ? form.service_office_id : ""}
                onChange={(e) => onChange({ service_office_id: e.target.value ? parseInt(e.target.value, 10) : 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving || serviceOfficeFixed || !!editingSubcontractor}
                required
              >
                <option value="">{t("Select service office")}</option>
                {serviceOffices.map((s) => (
                  <option key={s.service_office_id} value={s.service_office_id}>
                    {s.service_office_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contact_person_name" className="block text-sm font-medium text-slate-700 mb-2">
                {t("Contact Person Name")}
              </label>
              <input
                id="contact_person_name"
                type="text"
                maxLength={100}
                value={form.contact_person_name ?? ""}
                onChange={(e) => onChange({ contact_person_name: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="contact_person_phone" className="block text-sm font-medium text-slate-700 mb-2">
                {t("Contact Person Phone")}
              </label>
              <input
                id="contact_person_phone"
                type="tel"
                maxLength={20}
                value={form.contact_person_phone ?? ""}
                onChange={(e) => onChange({ contact_person_phone: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="contact_person_email" className="block text-sm font-medium text-slate-700 mb-2">
                {t("Contact Person Email")}
              </label>
              <input
                id="contact_person_email"
                type="email"
                maxLength={255}
                value={form.contact_person_email ?? ""}
                onChange={(e) => onChange({ contact_person_email: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="contact_person_address" className="block text-sm font-medium text-slate-700 mb-2">
                {t("Contact Person Address")}
              </label>
              <input
                id="contact_person_address"
                type="text"
                maxLength={255}
                value={form.contact_person_address ?? ""}
                onChange={(e) => onChange({ contact_person_address: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("Status")}</h3>
            <div className="flex gap-3">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ status: s })}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.status === s
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {t(s === 1 ? "Active" : s === 2 ? "Inactive" : "Deleted")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={!form.subcontractor_name?.trim() || !form.service_office_id || isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
            >
              {editingSubcontractor ? t("Update") : t("Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
