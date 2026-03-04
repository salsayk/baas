"use client";

import { useEffect, useCallback, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { SubcontractorModal } from "@/database/subcontractors/SubcontractorModal";
import type { CreateSubcontractorInput } from "@/database/subcontractors/types";
import type { CreateServiceOfficeUserInput, ServiceOfficeUser } from "@/database/service_office_users/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const USER_TYPE_LOOKUP_ID = 2;
const USER_PROFESSIONAL_GRADE_LOOKUP_ID = 3;
const SUBCONTRACTOR_USER_TYPE_VALUE_ID = 4;

const defaultSubcontractorForm: CreateSubcontractorInput & { status: number } = {
  subcontractor_name: "",
  service_office_id: 0,
  status: 1,
  contact_person_name: null,
  contact_person_phone: null,
  contact_person_email: null,
  contact_person_address: null,
};

interface LookupValue {
  value_id: number;
  value_name: string;
}

interface ServiceOfficeOption {
  service_office_id: number;
  service_office_name: string;
}

interface SubcontractorOption {
  subcontractor_id: number;
  subcontractor_name: string;
}

interface ServiceOfficeUserModalProps {
  isOpen: boolean;
  editingUser: ServiceOfficeUser | null;
  form: CreateServiceOfficeUserInput & { status: number };
  serviceOffices: ServiceOfficeOption[];
  subcontractors: SubcontractorOption[];
  isSaving: boolean;
  fixedServiceOfficeId?: number | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateServiceOfficeUserInput & { status: number }>) => void;
  onSubcontractorAdded?: (sub: SubcontractorOption) => void;
}

export function ServiceOfficeUserModal({
  isOpen,
  editingUser,
  form,
  serviceOffices,
  subcontractors,
  isSaving,
  fixedServiceOfficeId,
  onClose,
  onSave,
  onChange,
  onSubcontractorAdded,
}: ServiceOfficeUserModalProps) {
  const { languageId } = useLanguage();
  const [userTypes, setUserTypes] = useState<LookupValue[]>([]);
  const [professionalGrades, setProfessionalGrades] = useState<LookupValue[]>([]);
  const [isAddSubcontractorOpen, setIsAddSubcontractorOpen] = useState(false);
  const [addSubcontractorForm, setAddSubcontractorForm] = useState<CreateSubcontractorInput & { status: number }>(
    defaultSubcontractorForm
  );
  const [isSavingSubcontractor, setIsSavingSubcontractor] = useState(false);

  const fetchLookups = useCallback(async () => {
    if (!isOpen) return;
    try {
      const params = languageId ? `&language_id=${languageId}` : "";
      const [typeRes, gradeRes] = await Promise.all([
        fetch(`/api/system-lookup-values?lookup_table_id=${USER_TYPE_LOOKUP_ID}${params}`),
        fetch(`/api/system-lookup-values?lookup_table_id=${USER_PROFESSIONAL_GRADE_LOOKUP_ID}${params}`),
      ]);
      const typeData = typeRes.ok ? await typeRes.json() : [];
      const gradeData = gradeRes.ok ? await gradeRes.json() : [];
      setUserTypes(Array.isArray(typeData) ? typeData : []);
      setProfessionalGrades(Array.isArray(gradeData) ? gradeData : []);
    } catch {
      setUserTypes([]);
      setProfessionalGrades([]);
    }
  }, [isOpen, languageId]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  if (!isOpen) return null;

  const handleUserTypeChange = (userType: number) => {
    onChange({
      user_type: userType,
      ...(userType !== SUBCONTRACTOR_USER_TYPE_VALUE_ID ? { subcontractor_id: null } : {}),
    });
  };

  const openAddSubcontractor = () => {
    const soId = form.service_office_id || (fixedServiceOfficeId ?? 0);
    setAddSubcontractorForm({
      ...defaultSubcontractorForm,
      service_office_id: soId,
    });
    setIsAddSubcontractorOpen(true);
  };

  const closeAddSubcontractor = () => {
    setIsAddSubcontractorOpen(false);
    setAddSubcontractorForm(defaultSubcontractorForm);
  };

  const handleSaveSubcontractor = async () => {
    const soId = addSubcontractorForm.service_office_id;
    if (!addSubcontractorForm.subcontractor_name?.trim() || !soId) return;
    setIsSavingSubcontractor(true);
    try {
      const res = await fetch("/api/subcontractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addSubcontractorForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create subcontractor");
      }
      const created = await res.json();
      const newSub = {
        subcontractor_id: created.subcontractor_id,
        subcontractor_name: created.subcontractor_name,
      };
      onSubcontractorAdded?.(newSub);
      onChange({ subcontractor_id: created.subcontractor_id });
      closeAddSubcontractor();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add subcontractor");
    } finally {
      setIsSavingSubcontractor(false);
    }
  };

  const serviceOfficeFixed = fixedServiceOfficeId != null && fixedServiceOfficeId > 0;
  const subcontractorRequired = form.user_type === SUBCONTRACTOR_USER_TYPE_VALUE_ID;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {editingUser ? "Edit Service Office User" : "Add Service Office User"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingUser ? "Update user details" : "Fill in details for the new user"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="user_name" className="block text-sm font-medium text-slate-700 mb-2">
                User Name <span className="text-red-500">*</span>
              </label>
              <input
                id="user_name"
                type="text"
                maxLength={100}
                value={form.user_name ?? ""}
                onChange={(e) => onChange({ user_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                required
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="user_type" className="block text-sm font-medium text-slate-700 mb-2">
                User Type <span className="text-red-500">*</span>
              </label>
              <select
                id="user_type"
                value={form.user_type ?? ""}
                onChange={(e) => handleUserTypeChange(e.target.value ? parseInt(e.target.value, 10) : 0)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                required
                disabled={isSaving}
              >
                <option value="">Select user type</option>
                {userTypes.map((v) => (
                  <option key={v.value_id} value={v.value_id}>
                    {v.value_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="user_professional_grade" className="block text-sm font-medium text-slate-700 mb-2">
                User Professional Grade <span className="text-red-500">*</span>
              </label>
              <select
                id="user_professional_grade"
                value={form.user_professional_grade ?? ""}
                onChange={(e) =>
                  onChange({ user_professional_grade: e.target.value ? parseInt(e.target.value, 10) : 0 })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                required
                disabled={isSaving}
              >
                <option value="">Select grade</option>
                {professionalGrades.map((v) => (
                  <option key={v.value_id} value={v.value_id}>
                    {v.value_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="service_office_id" className="block text-sm font-medium text-slate-700 mb-2">
                Service Office <span className="text-red-500">*</span>
              </label>
              <select
                id="service_office_id"
                value={form.service_office_id && form.service_office_id > 0 ? form.service_office_id : ""}
                onChange={(e) => onChange({ service_office_id: e.target.value ? parseInt(e.target.value, 10) : 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving || serviceOfficeFixed || !!editingUser}
                required
              >
                <option value="">Select service office</option>
                {serviceOffices.map((s) => (
                  <option key={s.service_office_id} value={s.service_office_id}>
                    {s.service_office_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="subcontractor_id" className="block text-sm font-medium text-slate-700 mb-2">
                Subcontractor {subcontractorRequired && <span className="text-red-500">*</span>}
              </label>
              <div className="flex gap-2">
                <select
                  id="subcontractor_id"
                  value={form.subcontractor_id ?? ""}
                  onChange={(e) =>
                    onChange({ subcontractor_id: e.target.value ? parseInt(e.target.value, 10) : null })
                  }
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  required={subcontractorRequired}
                  disabled={isSaving || !subcontractorRequired}
                >
                  <option value="">— Select subcontractor —</option>
                  {subcontractors.map((s) => (
                    <option key={s.subcontractor_id} value={s.subcontractor_id}>
                      {s.subcontractor_name}
                    </option>
                  ))}
                </select>
                {subcontractorRequired && form.service_office_id && (
                  <button
                    type="button"
                    onClick={openAddSubcontractor}
                    disabled={isSaving}
                    className="flex-shrink-0 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
                    title="Add subcontractor"
                  >
                    +
                  </button>
                )}
              </div>
              {subcontractorRequired && subcontractors.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No subcontractors yet. Click the + button to add one.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="mobile_phone" className="block text-sm font-medium text-slate-700 mb-2">
                Mobile Phone <span className="text-red-500">*</span>
              </label>
              <input
                id="mobile_phone"
                type="tel"
                maxLength={20}
                value={form.mobile_phone ?? ""}
                onChange={(e) => onChange({ mobile_phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                required
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="secondary_phone" className="block text-sm font-medium text-slate-700 mb-2">
                Secondary Phone
              </label>
              <input
                id="secondary_phone"
                type="tel"
                maxLength={20}
                value={form.secondary_phone ?? ""}
                onChange={(e) => onChange({ secondary_phone: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email_address" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email_address"
                type="email"
                maxLength={255}
                value={form.email_address ?? ""}
                onChange={(e) => onChange({ email_address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Status</h3>
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
                  {STATUS_LABELS[s]}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !form.user_name?.trim() ||
                form.user_type == null ||
                form.user_professional_grade == null ||
                !form.service_office_id ||
                !form.mobile_phone?.trim() ||
                !form.email_address?.trim() ||
                (form.user_type === SUBCONTRACTOR_USER_TYPE_VALUE_ID && !form.subcontractor_id) ||
                isSaving
              }
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
            >
              {editingUser ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>

      <SubcontractorModal
        isOpen={isAddSubcontractorOpen}
        editingSubcontractor={null}
        form={addSubcontractorForm}
        serviceOffices={
          (() => {
            const soId = form.service_office_id || fixedServiceOfficeId;
            if (!soId) return serviceOffices;
            const match = serviceOffices.find((s) => s.service_office_id === soId);
            return match ? [match] : serviceOffices;
          })()
        }
        fixedServiceOfficeId={form.service_office_id || fixedServiceOfficeId || undefined}
        isSaving={isSavingSubcontractor}
        onClose={closeAddSubcontractor}
        onSave={handleSaveSubcontractor}
        onChange={(updates) => setAddSubcontractorForm((prev) => ({ ...prev, ...updates }))}
      />
    </div>
  );
}
