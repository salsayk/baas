/** Matches `subscriptions_offers` + current row from `subscription_offer_prices` (open interval). */

export interface SubscriptionOffer {
  subscription_offer_id: number;
  administrator_restricted_offer: number;
  subscription_offer_name: string;
  subscription_offer_type: number;
  /** Current monthly price from the open `subscription_offer_prices` row (null if missing). */
  subscription_offer_monthly_price?: string | number | null;
  /** Current currency from the open price row (null if missing). */
  offer_currency?: string | null;
  status: number;
  creation_datetime?: string;
  /** Present only after at least one UPDATE; null on new rows until then. */
  updated_datetime?: string | null;
}

export interface CreateSubscriptionOfferInput {
  administrator_restricted_offer: number;
  subscription_offer_name: string;
  subscription_offer_type: number;
  subscription_offer_monthly_price: number;
  offer_currency: string;
  status: number;
}

export type UpdateSubscriptionOfferInput = Partial<CreateSubscriptionOfferInput>;
