"use client";

import { COUNTRIES } from "@/database/Service_Offices/countries";
import type { CreateCustomerInput, Customer } from "@/database/customer/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

interface ServiceOfficeOption {
  service_office_id: number;
  service_office_name: string;
}

interface CustomerModalProps {
  isOpen: boolean;
  editingCustomer: Customer | null;
  form: CreateCustomerInput & { status: number };
  serviceOffices: ServiceOfficeOption[];
  isSaving: boolean;
  fixedServiceOfficeId?: number | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateCustomerInput & { status: number }>) => void;
}

export function CustomerModal({
  isOpen,
  editingCustomer,
  form,
  serviceOffices,
  isSaving,
  fixedServiceOfficeId,
  onClose,
  onSave,
  onChange,
}: CustomerModalProps) {
  if (!isOpen) return null;

  const serviceOfficeFixed = fixedServiceOfficeId != null && fixedServiceOfficeId > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {editingCustomer ? "Edit Customer" : "Add Customer"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingCustomer ? "Update the customer details" : "Fill in the details for the new customer"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="customer_name" className="block text-sm font-medium text-slate-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                id="customer_name"
                type="text"
                maxLength={100}
                value={form.customer_name ?? ""}
                onChange={(e) => onChange({ customer_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                required
                disabled={isSaving}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="service_office_id" className="block text-sm font-medium text-slate-700 mb-2">
                Service Office <span className="text-red-500">*</span>
              </label>
              <select
                id="service_office_id"
                value={form.service_office_id && form.service_office_id > 0 ? form.service_office_id : ""}
                onChange={(e) =>
                  onChange({ service_office_id: e.target.value ? parseInt(e.target.value, 10) : 0 })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                disabled={isSaving || serviceOfficeFixed || !!editingCustomer}
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
              <label htmlFor="email_address" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email_address"
                type="email"
                maxLength={255}
                value={form.email_address ?? ""}
                onChange={(e) => onChange({ email_address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                required
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="legal_id" className="block text-sm font-medium text-slate-700 mb-2">
                Legal ID
              </label>
              <input
                id="legal_id"
                type="text"
                maxLength={100}
                value={form.legal_id ?? ""}
                onChange={(e) => onChange({ legal_id: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="mobile_phone" className="block text-sm font-medium text-slate-700 mb-2">
                Mobile Phone
              </label>
              <input
                id="mobile_phone"
                type="tel"
                maxLength={20}
                value={form.mobile_phone ?? ""}
                onChange={(e) => onChange({ mobile_phone: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
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

            <div>
              <label htmlFor="address_country" className="block text-sm font-medium text-slate-700 mb-2">
                Address Country
              </label>
              <select
                id="address_country"
                value={form.address_country ?? ""}
                onChange={(e) => onChange({ address_country: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
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

            <div>
              <label htmlFor="address_city" className="block text-sm font-medium text-slate-700 mb-2">
                Address City
              </label>
              <input
                id="address_city"
                type="text"
                maxLength={50}
                value={form.address_city ?? ""}
                onChange={(e) => onChange({ address_city: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="address_street" className="block text-sm font-medium text-slate-700 mb-2">
                Address Street
              </label>
              <input
                id="address_street"
                type="text"
                maxLength={50}
                value={form.address_street ?? ""}
                onChange={(e) => onChange({ address_street: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="address_street_number" className="block text-sm font-medium text-slate-700 mb-2">
                Address Street Number
              </label>
              <input
                id="address_street_number"
                type="number"
                value={form.address_street_number ?? ""}
                onChange={(e) =>
                  onChange({
                    address_street_number: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                disabled={isSaving}
              />
            </div>

            <div>
              <label htmlFor="address_zip_code" className="block text-sm font-medium text-slate-700 mb-2">
                Address Zip Code
              </label>
              <input
                id="address_zip_code"
                type="text"
                maxLength={50}
                value={form.address_zip_code ?? ""}
                onChange={(e) => onChange({ address_zip_code: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
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
              disabled={!form.customer_name?.trim() || !form.email_address?.trim() || !form.service_office_id || isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
            >
              {editingCustomer ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
