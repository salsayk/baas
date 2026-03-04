/**
 * Enumerator for system lookup tables.
 * Use these keys to correlate a UI component dropdown to a specific system lookup table.
 *
 * Values match `lookup_table_name` in the `system_lookups` table.
 * Generated from DB. To regenerate: node database/system_lookups/generate-system-lookup-tables-enum.mjs
 *
 * Usage example:
 *   const lookupTableName = SystemLookupTable.AccountType;
 *   const lookups = await fetch(`/api/system-lookups`).then(r => r.json());
 *   const table = lookups.find((l: SystemLookup) => l.lookup_table_name === lookupTableName);
 *   const values = await fetch(`/api/system-lookup-values?lookup_table_id=${table?.lookup_table_id}`).then(r => r.json());
 */
export const SystemLookupTable = {
  AuthorizedEntityType: "Authorized Entity Type",
  ContractType: "Contract Type",
  Currency: "Currency",
  MilestoneConditionMetIndicator: "Milestone condition met indicator",
  Permission: "Permission",
  PpProformaIndicators: "PP Proforma Indicators",
  PpProformaOccasion: "PP Proforma occasion",
  PpProformaRecurrence: "PP Proforma Recurrence",
  SecurityActivityHistoryEntityType: "Security Activity History Entity Type",
  SecurityActivityHistoryInfoType: "Security Activity History Info Type",
  Status: "Status",
  SubscriptionOffer: "Subscription Offer",
  UserProfessionalGrade: "User Professional Grade",
  UserType: "User Type",
} as const;

export type SystemLookupTableKey = keyof typeof SystemLookupTable;

export type SystemLookupTableName = (typeof SystemLookupTable)[SystemLookupTableKey];
