-- Create subcontractors table for PostgreSQL
-- Depends on: service_offices table
-- Run: node database/run-sql.mjs database/subcontractors/create-subcontractors-table.sql

CREATE TABLE IF NOT EXISTS subcontractors (
  subcontractor_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subcontractor_name         VARCHAR(100) NOT NULL,
  service_office_id          BIGINT NOT NULL REFERENCES service_offices(service_office_id) ON DELETE CASCADE,
  status                     SMALLINT NOT NULL,
  contact_person_name        VARCHAR(100),
  contact_person_phone       VARCHAR(20),
  contact_person_email       VARCHAR(255),
  contact_person_address     VARCHAR(255),
  creation_datetime          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_datetime           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE subcontractors IS 'Subcontractors linked to service offices.';
COMMENT ON COLUMN subcontractors.subcontractor_name IS 'Subcontractor name (max 100 chars).';
COMMENT ON COLUMN subcontractors.service_office_id IS 'Reference to service office.';
COMMENT ON COLUMN subcontractors.status IS 'Subcontractor status code.';
COMMENT ON COLUMN subcontractors.contact_person_name IS 'Contact person name (max 100 chars).';
COMMENT ON COLUMN subcontractors.contact_person_phone IS 'Contact person phone (max 20 chars).';
COMMENT ON COLUMN subcontractors.contact_person_email IS 'Contact person email (max 255 chars).';
COMMENT ON COLUMN subcontractors.contact_person_address IS 'Contact person address (max 255 chars).';
COMMENT ON COLUMN subcontractors.creation_datetime IS 'Record creation timestamp.';
COMMENT ON COLUMN subcontractors.updated_datetime IS 'Last update timestamp.';

CREATE INDEX IF NOT EXISTS idx_subcontractors_service_office_id ON subcontractors(service_office_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_status ON subcontractors(status);
CREATE INDEX IF NOT EXISTS idx_subcontractors_name ON subcontractors(subcontractor_name);

CREATE OR REPLACE FUNCTION update_subcontractors_updated_datetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_datetime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subcontractors_updated_datetime ON subcontractors;
CREATE TRIGGER trigger_subcontractors_updated_datetime
  BEFORE UPDATE ON subcontractors
  FOR EACH ROW
  EXECUTE PROCEDURE update_subcontractors_updated_datetime();
