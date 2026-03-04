"use client";

import type { CreateProjectInput, Project } from "@/database/project/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

interface ServiceOfficeOption {
  service_office_id: number;
  service_office_name: string;
}

interface CustomerOption {
  customer_id: number;
  customer_name: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  editingProject: Project | null;
  form: CreateProjectInput & { status: number };
  serviceOffices: ServiceOfficeOption[];
  customers: CustomerOption[];
  isSaving: boolean;
  fixedServiceOfficeId?: number | null;
  fixedCustomerId?: number | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateProjectInput & { status: number }>) => void;
}

export function ProjectModal({
  isOpen,
  editingProject,
  form,
  serviceOffices,
  customers,
  isSaving,
  fixedServiceOfficeId,
  fixedCustomerId,
  onClose,
  onSave,
  onChange,
}: ProjectModalProps) {
  if (!isOpen) return null;

  const serviceOfficeFixed = fixedServiceOfficeId != null && fixedServiceOfficeId > 0;
  const customerFixed = fixedCustomerId != null && fixedCustomerId > 0;

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
            {editingProject ? "Edit Project" : "Add Project"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingProject ? "Update project details" : "Fill in details for the new project"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="project_name" className="block text-sm font-medium text-slate-700 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                id="project_name"
                type="text"
                maxLength={100}
                value={form.project_name ?? ""}
                onChange={(e) => onChange({ project_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                required
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="service_office_id" className="block text-sm font-medium text-slate-700 mb-2">
                Service Office <span className="text-red-500">*</span>
              </label>
              <select
                id="service_office_id"
                value={form.service_office_id && form.service_office_id > 0 ? form.service_office_id : ""}
                onChange={(e) =>
                  onChange({ service_office_id: e.target.value ? parseInt(e.target.value, 10) : 0, customer_id: 0 })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving || serviceOfficeFixed || !!editingProject}
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

            <div>
              <label htmlFor="customer_id" className="block text-sm font-medium text-slate-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                id="customer_id"
                value={form.customer_id && form.customer_id > 0 ? form.customer_id : ""}
                onChange={(e) => onChange({ customer_id: e.target.value ? parseInt(e.target.value, 10) : 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving || customerFixed || !!editingProject}
                required
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="project_scope_description" className="block text-sm font-medium text-slate-700 mb-2">
                Project Scope Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="project_scope_description"
                maxLength={250}
                rows={4}
                value={form.project_scope_description ?? ""}
                onChange={(e) => onChange({ project_scope_description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 resize-none"
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
                !form.project_name?.trim() ||
                !form.project_scope_description?.trim() ||
                !form.service_office_id ||
                !form.customer_id ||
                isSaving
              }
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
            >
              {editingProject ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
