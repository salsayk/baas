/**
 * Returned as API `error` when saving would create a second Active row for the same `subscription_offer_type`.
 * Must match `source_text` in `languages_screens_translations` for `t()` to translate on the client.
 */
export const SUBSCRIPTIONS_OFFER_ACTIVE_TYPE_CONFLICT =
  "Only one active subscription offer is allowed per offer type.";
