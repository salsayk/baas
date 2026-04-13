"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { useTranslations } from "@/app/context/TranslationContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import {
  SubscriptionOfferModal,
  SUBSCRIPTION_OFFER_TYPE_ZERO_PRICE,
  type SubscriptionOfferFormState,
  type SubscriptionOfferTypeOption,
} from "@/database/subscriptions_offers/SubscriptionOfferModal";
import type { SubscriptionOffer } from "@/database/subscriptions_offers/types";

const LOOKUP_TABLE_ID = 8;

function parsePriceToNumber(raw: string): number | null {
  const n = parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function defaultForm(): SubscriptionOfferFormState {
  return {
    administrator_restricted_offer: 0,
    subscription_offer_type: "",
    subscription_offer_monthly_price: "",
    offer_currency: "ILS",
    status: 1,
  };
}

function offerToForm(offer: SubscriptionOffer): SubscriptionOfferFormState {
  const typeNum = Number(offer.subscription_offer_type);
  const price = offer.subscription_offer_monthly_price;
  const num =
    price === null || price === undefined
      ? NaN
      : typeof price === "string"
        ? parseFloat(price)
        : Number(price);
  const priceStr =
    typeNum === SUBSCRIPTION_OFFER_TYPE_ZERO_PRICE
      ? "0"
      : Number.isFinite(num)
        ? num.toFixed(2)
        : "";
  return {
    administrator_restricted_offer: Number(offer.administrator_restricted_offer),
    subscription_offer_type: typeNum,
    subscription_offer_monthly_price: priceStr,
    offer_currency: String(offer.offer_currency ?? "ILS").slice(0, 3),
    status: Number(offer.status),
  };
}

function SubscriptionsOffersContent() {
  const { t, refreshTranslations } = useTranslations();
  const { languageId } = useLanguage();
  const { notifications, dismissNotification, notifyCreate, notifyUpdate, notifyDelete, notifyError } =
    useNotifications();

  const [offers, setOffers] = useState<SubscriptionOffer[]>([]);
  const [offerTypeOptions, setOfferTypeOptions] = useState<SubscriptionOfferTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SubscriptionOffer | null>(null);
  const [form, setForm] = useState<SubscriptionOfferFormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    refreshTranslations();
  }, [refreshTranslations]);

  const fetchOfferTypes = useCallback(async () => {
    try {
      const params = new URLSearchParams({ lookup_table_id: String(LOOKUP_TABLE_ID) });
      if (languageId) params.set("language_id", String(languageId));
      const res = await fetch(`/api/system-lookup-values?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) {
        setOfferTypeOptions([]);
        return;
      }
      setOfferTypeOptions(
        data.map((row: { value_id: number; value_name: string }) => ({
          value_id: Number(row.value_id),
          value_name: String(row.value_name ?? ""),
        }))
      );
    } catch {
      setOfferTypeOptions([]);
    }
  }, [languageId]);

  /** Reload grid from server (used on mount and whenever the offer modal closes / after save). */
  const reloadOffers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/subscriptions-offers?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch subscription offers");
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    void reloadOffers();
  }, [reloadOffers]);

  useEffect(() => {
    fetchOfferTypes();
  }, [fetchOfferTypes]);

  const getTypeLabel = useMemo(() => {
    const map = new Map<number, string>();
    offerTypeOptions.forEach((o) => map.set(Number(o.value_id), o.value_name));
    return (valueId: number) => map.get(valueId) ?? String(valueId);
  }, [offerTypeOptions]);

  const closeModalState = useCallback(() => {
    setIsModalOpen(false);
    setEditingOffer(null);
    setForm(defaultForm());
  }, []);

  /** Close modal (Cancel / backdrop / X) and reload the grid from the server. */
  const onModalClose = useCallback(() => {
    closeModalState();
    setIsLoading(true);
    void reloadOffers();
  }, [closeModalState, reloadOffers]);

  const openCreateModal = () => {
    setEditingOffer(null);
    setForm(defaultForm());
    setIsModalOpen(true);
  };

  const openEditModal = (offer: SubscriptionOffer) => {
    setEditingOffer(offer);
    setForm(offerToForm(offer));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const selected = offerTypeOptions.find((o) => Number(o.value_id) === Number(form.subscription_offer_type));
    const subscription_offer_name = (selected?.value_name ?? "").trim().slice(0, 100);
    if (!subscription_offer_name) {
      notifyError(t("Select subscription offer type"));
      return;
    }
    const price = parsePriceToNumber(form.subscription_offer_monthly_price);
    if (price == null || price < 0) {
      notifyError(t("Subscription offer monthly price is required"));
      return;
    }

    setIsSaving(true);
    try {
      if (editingOffer) {
        const res = await fetch(`/api/subscriptions-offers/${editingOffer.subscription_offer_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            administrator_restricted_offer: form.administrator_restricted_offer,
            subscription_offer_name,
            subscription_offer_type: Number(form.subscription_offer_type),
            subscription_offer_monthly_price: price,
            offer_currency: form.offer_currency,
            status: form.status,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        await res.json().catch(() => null);
        notifyUpdate(t("Subscription offer updated"));
      } else {
        const res = await fetch("/api/subscriptions-offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            administrator_restricted_offer: form.administrator_restricted_offer,
            subscription_offer_name,
            subscription_offer_type: Number(form.subscription_offer_type),
            subscription_offer_monthly_price: price,
            offer_currency: form.offer_currency,
            status: form.status,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        await res.json().catch(() => null);
        notifyCreate(t("Subscription offer created"));
      }
      setIsLoading(true);
      await reloadOffers();
      closeModalState();
    } catch (err) {
      notifyError(err instanceof Error ? t(err.message) : t("Operation failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subscriptionOfferId: number) => {
    try {
      const res = await fetch(`/api/subscriptions-offers/${subscriptionOfferId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      setDeleteConfirm(null);
      notifyDelete(t("Subscription offer deleted"));
      setIsLoading(true);
      await reloadOffers();
    } catch (err) {
      notifyError(err instanceof Error ? t(err.message) : t("Delete failed"));
    }
  };

  const formatPrice = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "—";
    const n = typeof v === "string" ? parseFloat(v) : Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(2);
  };

  return (
    <div className="app-layout-with-sidebar min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-row">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Pages</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t("Subscriptions offers")}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t("Subscriptions offers")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6 lg:mb-8 text-sm lg:text-base">{t("Manage subscription service offers and pricing")}</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center gap-3">
              <p className="text-sm text-red-700 dark:text-red-300 flex-1">{t(error)}</p>
              <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                ×
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("Subscription offers list")}</h2>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                {t("Add Service offer")}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Subscription offer name")}
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      {t("Subscription offer type")}
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Subscription offer monthly price")}
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      {t("Offer currency")}
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      {t("Administrator restricted offer")}
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Status")}
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("Loading subscription offers")}
                      </td>
                    </tr>
                  ) : offers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        {t("No subscription offers yet")}
                      </td>
                    </tr>
                  ) : (
                    offers.map((offer) => (
                      <tr key={offer.subscription_offer_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                          {offer.subscription_offer_name}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-slate-700 dark:text-slate-300 hidden md:table-cell">
                          {getTypeLabel(Number(offer.subscription_offer_type))}
                        </td>
                        <td
                          className="px-4 lg:px-6 py-4 text-end tabular-nums text-slate-800 dark:text-slate-200"
                          data-no-auto-translate
                        >
                          {formatPrice(offer.subscription_offer_monthly_price)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                          {offer.offer_currency ?? "—"}
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden lg:table-cell text-slate-700 dark:text-slate-300">
                          {Number(offer.administrator_restricted_offer) === 1 ? t("Yes") : t("No")}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${
                              Number(offer.status) === 1
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : Number(offer.status) === 2
                                  ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {Number(offer.status) === 1
                              ? t("Active")
                              : Number(offer.status) === 2
                                ? t("Inactive")
                                : t("Deleted")}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(offer)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              title={t("Edit")}
                              aria-label={t("Edit")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                            </button>
                            {deleteConfirm === Number(offer.subscription_offer_id) ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(Number(offer.subscription_offer_id))}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                  {t("Confirm")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {t("Cancel")}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(Number(offer.subscription_offer_id))}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"
                                title={t("Delete")}
                                aria-label={t("Delete")}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
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

        <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
      </main>

      <SubscriptionOfferModal
        isOpen={isModalOpen}
        editingOffer={editingOffer}
        form={form}
        offerTypeOptions={offerTypeOptions}
        isSaving={isSaving}
        onClose={onModalClose}
        onSave={handleSave}
        onChange={(updates) => setForm((f) => ({ ...f, ...updates }))}
      />
    </div>
  );
}

export default function SubscriptionsOffersPage() {
  return (
    <SidebarProvider>
      <SubscriptionsOffersContent />
    </SidebarProvider>
  );
}
