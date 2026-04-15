-- Make milestone_amount / milestone_percentage nullable by type:
-- - milestone_type = 0 (Fixed): milestone_amount required, milestone_percentage must be NULL
-- - milestone_type = 1 (Percentage): milestone_amount must be NULL, milestone_percentage required (0..100)
-- Run: node database/run-sql.mjs database/contract_milestones_data_for_success/alter-milestone-type-amount-percentage-nullability.sql

ALTER TABLE contract_milestones_data_for_success
  DROP CONSTRAINT IF EXISTS contract_milestones_data_for_success_type_amount_pct_chk;

ALTER TABLE contract_milestones_data_for_success
  DROP CONSTRAINT IF EXISTS contract_milestones_data_for_success_pct_range_chk;

ALTER TABLE contract_milestones_data_for_success
  ALTER COLUMN milestone_amount DROP NOT NULL;

ALTER TABLE contract_milestones_data_for_success
  ALTER COLUMN milestone_percentage DROP NOT NULL;

ALTER TABLE contract_milestones_data_for_success
  ADD CONSTRAINT contract_milestones_data_for_success_pct_range_chk
  CHECK (
    milestone_percentage IS NULL
    OR (milestone_percentage >= 0 AND milestone_percentage <= 100)
  );

ALTER TABLE contract_milestones_data_for_success
  ADD CONSTRAINT contract_milestones_data_for_success_type_amount_pct_chk
  CHECK (
    (milestone_type = 0 AND milestone_amount IS NOT NULL AND milestone_percentage IS NULL)
    OR (milestone_type = 1 AND milestone_amount IS NULL AND milestone_percentage IS NOT NULL)
  );

