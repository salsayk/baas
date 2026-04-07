"use client";

import { useMemo } from "react";

/** Lookup `value_id` for offer types that use a fixed zero monthly price (UI: disabled field). */
export const SUBSCRIPTION_OFFER_TYPE_ZERO_PRICE = 0;
import { useTranslations } from "@/app/context/TranslationContext";
import { CURRENCY_CODES } from "@/database/contracts/currencies";
import type { SubscriptionOffer } from "@/database/subscriptions_offers/types";

export interface SubscriptionOfferTypeOption {
  value_id: number;
  value_name: string;
}

export interface SubscriptionOfferFormState {
  administrator_restricted_offer: number;
  subscription_offer_type: number | "";
  subscription_offer_monthly_price: string;
  offer_currency: string;
  status: number;
}

interface SubscriptionOfferModalProps {
  isOpen: boolean;
  editingOffer: SubscriptionOffer | null;
  form: SubscriptionOfferFormState;
  offerTypeOptions: SubscriptionOfferTypeOption[];
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<SubscriptionOfferFormState>) => void;
}

function parsePriceToNumber(raw: string): number | null {
  const n = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function SubscriptionOfferModal({
  isOpen,
  editingOffer,
  form,
  offerTypeOptions,
  isSaving,
  onClose,
  onSave,
  onChange,
}: SubscriptionOfferModalProps) {
  const { t } = useTranslations();

  const selectedTypeLabel = useMemo(() => {
    if (form.subscription_offer_type === "") return "";
    const row = offerTypeOptions.find((o) => Number(o.value_id) === Number(form.subscription_offer_type));
    return row?.value_name?.trim() ?? "";
  }, [form.subscription_offer_type, offerTypeOptions]);

  const isZeroPriceOfferType =
    form.subscription_offer_type !== "" && Number(form.subscription_offer_type) === SUBSCRIPTION_OFFER_TYPE_ZERO_PRICE;

  const priceNum = parsePriceToNumber(form.subscription_offer_monthly_price);
  const isPriceValid = priceNum != null && priceNum >= 0;
  const isTypeValid = form.subscription_offer_type !== "";
  const canSubmit = isTypeValid && isPriceValid && !!form.offer_currency?.trim();

  const statusChoices = editingOffer ? ([1, 2, 3] as const) : ([1, 2] as const);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSaving) return;
    onSave();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {editingOffer ? t("Edit Service offer") : t("Add Service offer")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {editingOffer ? t("Update Service offer details") : t("Fill in details for the new Service offer")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="subscription_offer_type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("Subscription offer type")} <span className="text-red-500">*</span>
            </label>
            <select
              id="subscription_offer_type"
              value={form.subscription_offer_type === "" ? "" : String(form.subscription_offer_type)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  onChange({ subscription_offer_type: "" });
                  return;
                }
                const nextType = parseInt(v, 10);
                const prevWasZero =
                  form.subscription_offer_type !== "" &&
                  Number(form.subscription_offer_type) === SUBSCRIPTION_OFFER_TYPE_ZERO_PRICE;
                if (nextType === SUBSCRIPTION_OFFER_TYPE_ZERO_PRICE) {
                  onChange({
                    subscription_offer_type: nextType,
                    subscription_offer_monthly_price: "0",
                  });
                } else {
                  onChange({
                    subscription_offer_type: nextType,
                    subscription_offer_monthly_price: prevWasZero ? "" : form.subscription_offer_monthly_price,
                  });
                }
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              disabled={isSaving}
              required
            >
              <option value="">{t("Select subscription offer type")}</option>
              {offerTypeOptions.map((o) => (
                <option key={`subscription-offer-type-${o.value_id}`} value={String(o.value_id)}>
                  {o.value_name}
                </option>
              ))}
            </select>
            {selectedTypeLabel ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t("Saved offer name")}: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedTypeLabel}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="subscription_offer_monthly_price" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("Subscription offer monthly price")} <span className="text-red-500">*</span>
            </label>
            <input
              id="subscription_offer_monthly_price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={isZeroPriceOfferType ? "0" : form.subscription_offer_monthly_price}
              onChange={(e) => onChange({ subscription_offer_monthly_price: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 ${
                isZeroPriceOfferType ? "bg-slate-100 dark:bg-slate-800 cursor-not-allowed" : "bg-white dark:bg-slate-900"
              }`}
              disabled={isSaving || isZeroPriceOfferType}
              required={!isZeroPriceOfferType}
            />
          </div>

          <div>
            <label htmlFor="offer_currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("Offer currency")} <span className="text-red-500">*</span>
            </label>
            <select
              id="offer_currency"
              value={form.offer_currency || ""}
              onChange={(e) => onChange({ offer_currency: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              disabled={isSaving}
              required
            >
              {CURRENCY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("Administrator restricted offer")}</h3>
            <div className="flex gap-3">
              {([0, 1] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ administrator_restricted_offer: v })}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.administrator_restricted_offer === v
                      ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {v === 0 ? t("No") : t("Yes")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t("Status")} <span className="text-red-500">*</span>
            </h3>
            <div className="flex gap-3">
              {statusChoices.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ status: s })}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.status === s
                      ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {t(s === 1 ? "Active" : s === 2 ? "Inactive" : "Deleted")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 hover:bg-violet-700"
            >
              {editingOffer ? t("Update") : t("Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
