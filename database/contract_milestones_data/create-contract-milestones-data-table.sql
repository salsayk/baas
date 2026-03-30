-- Create table: contract_milestones_data
-- Run: node database/run-sql.mjs database/contract_milestones_data/create-contract-milestones-data-table.sql

CREATE TABLE IF NOT EXISTS contract_milestones_data (
  contract_id BIGINT NOT NULL,
  milestone_sequential_number INTEGER NOT NULL,
  milestone_criteria VARCHAR(200),
  milestone_due_date DATE,
  milestone_amount NUMERIC(18,2) NOT NULL,
  milestone_percentage NUMERIC(5,2) NOT NULL,
  progress_status SMALLINT DEFAULT 0,
  milestone_condition_met_indicator SMALLINT NOT NULL DEFAULT 0,
  progress_status_date DATE,
  milestone_met_date DATE,
  progress_status_user_id BIGINT,
  milestone_met_mark_user_id BIGINT,

  CONSTRAINT contract_milestones_data_pk
    PRIMARY KEY (contract_id, milestone_sequential_number),
  CONSTRAINT contract_milestones_data_milestone_seq_positive_chk
    CHECK (milestone_sequential_number >= 1),
  CONSTRAINT contract_milestones_data_milestone_percentage_range_chk
    CHECK (milestone_percentage >= 0 AND milestone_percentage <= 100)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_milestones_data_contract_fk'
  ) THEN
    ALTER TABLE contract_milestones_data
      ADD CONSTRAINT contract_milestones_data_contract_fk
      FOREIGN KEY (contract_id)
      REFERENCES contracts(contract_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_contract_milestone_seq_if_missing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.milestone_sequential_number IS NULL THEN
    SELECT COALESCE(MAX(m.milestone_sequential_number), 0) + 1
      INTO NEW.milestone_sequential_number
    FROM contract_milestones_data m
    WHERE m.contract_id = NEW.contract_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_contract_milestone_seq_if_missing ON contract_milestones_data;
CREATE TRIGGER trigger_set_contract_milestone_seq_if_missing
  BEFORE INSERT ON contract_milestones_data
  FOR EACH ROW
  EXECUTE PROCEDURE set_contract_milestone_seq_if_missing();

CREATE OR REPLACE FUNCTION validate_contract_milestone_seq_order()
RETURNS TRIGGER AS $$
DECLARE
  expected_next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(m.milestone_sequential_number), 0) + 1
    INTO expected_next_seq
  FROM contract_milestones_data m
  WHERE m.contract_id = NEW.contract_id;

  IF NEW.milestone_sequential_number <> expected_next_seq THEN
    RAISE EXCEPTION
      'milestone_sequential_number must be % for contract_id % (got %)',
      expected_next_seq, NEW.contract_id, NEW.milestone_sequential_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_contract_milestone_seq_order ON contract_milestones_data;
CREATE TRIGGER trigger_validate_contract_milestone_seq_order
  BEFORE INSERT ON contract_milestones_data
  FOR EACH ROW
  EXECUTE PROCEDURE validate_contract_milestone_seq_order();
