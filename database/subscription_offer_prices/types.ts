/** Row shape for `subscription_offer_prices` (see create-subscription-offer-prices-table.sql). */

export interface SubscriptionOfferPrice {
  subscription_offer_price_id: number;
  subscription_offer_id: number;
  subscription_offer_monthly_price: number;
  offer_currency: string;
  price_start_datetime: string;
  price_end_datetime: string | null;
}
