/** Matches `subscriptions_offers` table; `subscription_offer_type` is `system_lookup_values.value_id` for lookup_table_id 8. */

export interface SubscriptionOffer {
  subscription_offer_id: number;
  administrator_restricted_offer: number;
  subscription_offer_name: string;
  subscription_offer_type: number;
  subscription_offer_monthly_price: string | number;
  offer_currency: string;
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
