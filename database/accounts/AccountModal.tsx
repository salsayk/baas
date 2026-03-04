"use client";

import type { Account, CreateAccountInput } from "@/database/accounts/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

interface AccountModalProps {
  isOpen: boolean;
  editingAccount: Account | null;
  form: CreateAccountInput & { status: number };
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateAccountInput & { status: number }>) => void;
}

export function AccountModal({
  isOpen,
  editingAccount,
  form,
  isSaving,
  onClose,
  onSave,
  onChange,
}: AccountModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    onChange({
      card_number: digits || null,
      card_last_four: digits.length >= 4 ? digits.slice(-4) : null,
    });
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
            {editingAccount ? "Edit Account" : "Add New Account"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingAccount
              ? "Update the account details below"
              : "Fill in the details to create a new account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Basic Information
            </h3>
            <div>
              <label htmlFor="account_name" className="block text-sm font-medium text-slate-700 mb-2">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                id="account_name"
                type="text"
                maxLength={100}
                value={form.account_name ?? ""}
                onChange={(e) => onChange({ account_name: e.target.value })}
                placeholder="e.g. Acme Corp"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                required
                disabled={isSaving}
              />
            </div>
          </section>

          {/* Contact Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
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
                  placeholder="+1 234 567 8901"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email_address" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email_address"
                type="email"
                maxLength={255}
                value={form.email_address ?? ""}
                onChange={(e) => onChange({ email_address: e.target.value || null })}
                placeholder="contact@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                disabled={isSaving}
              />
            </div>
          </section>

          {/* Credit Card Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Credit Card Information
            </h3>
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
              <p className="text-xs text-amber-800 mb-4">
                Store card data securely. In production, use a payment processor.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="card_holder_name" className="block text-sm font-medium text-slate-700 mb-2">
                    Card Holder Name
                  </label>
                  <input
                    id="card_holder_name"
                    type="text"
                    maxLength={100}
                    value={form.card_holder_name ?? ""}
                    onChange={(e) => onChange({ card_holder_name: e.target.value || null })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label htmlFor="card_number" className="block text-sm font-medium text-slate-700 mb-2">
                    Card Number
                  </label>
                  <input
                    id="card_number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={form.card_number ?? ""}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    placeholder="4111 1111 1111 1111"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    disabled={isSaving}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="card_expiry_month" className="block text-sm font-medium text-slate-700 mb-2">
                      Expiry Month
                    </label>
                    <select
                      id="card_expiry_month"
                      value={form.card_expiry_month ?? ""}
                      onChange={(e) =>
                        onChange({
                          card_expiry_month: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      disabled={isSaving}
                    >
                      <option value="">—</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {String(i + 1).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="card_expiry_year" className="block text-sm font-medium text-slate-700 mb-2">
                      Expiry Year
                    </label>
                    <select
                      id="card_expiry_year"
                      value={form.card_expiry_year ?? ""}
                      onChange={(e) =>
                        onChange({
                          card_expiry_year: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      disabled={isSaving}
                    >
                      <option value="">—</option>
                      {Array.from({ length: 15 }, (_, i) => {
                        const y = new Date().getFullYear() + i;
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="card_cvv" className="block text-sm font-medium text-slate-700 mb-2">
                    CVV
                  </label>
                  <input
                    id="card_cvv"
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={4}
                    value={form.card_cvv ?? ""}
                    onChange={(e) =>
                      onChange({
                        card_cvv: e.target.value ? e.target.value.replace(/\D/g, "").slice(0, 4) : null,
                      })
                    }
                    placeholder="123"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Status Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              Status
            </h3>
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
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.account_name?.trim() || isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {editingAccount ? "Update Account" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
