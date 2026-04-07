-- Allow milestone_percentage_reference_figure_description to be NULL for milestone_type=0 (Fixed).
-- Required when milestone_type=1 (Percentage). Run if you already applied an older create script with NOT NULL on this column.
-- Run: node database/run-sql.mjs database/contract_milestones_data_for_success/alter-reference-figure-nullable-for-fixed-type.sql

ALTER TABLE contract_milestones_data_for_success
  DROP CONSTRAINT IF EXISTS contract_milestones_data_for_success_ref_figure_chk;

ALTER TABLE contract_milestones_data_for_success
  ALTER COLUMN milestone_percentage_reference_figure_description DROP NOT NULL;

ALTER TABLE contract_milestones_data_for_success
  ADD CONSTRAINT contract_milestones_data_for_success_ref_figure_chk
  CHECK (
    (milestone_type <> 1)
    OR (milestone_percentage_reference_figure_description IS NOT NULL)
  );

COMMENT ON COLUMN contract_milestones_data_for_success.milestone_percentage_reference_figure_description IS
  'Numeric reference figure for percentage milestones (milestone_type=1); NULL when milestone_type=0 (Fixed).';
