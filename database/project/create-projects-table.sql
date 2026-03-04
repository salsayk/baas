-- Create projects table for PostgreSQL
-- Depends on: service_offices table, customers table
-- Run: node database/run-sql.mjs database/project/create-projects-table.sql

CREATE TABLE IF NOT EXISTS projects (
  project_id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_name               VARCHAR(100) NOT NULL,
  service_office_id          BIGINT NOT NULL REFERENCES service_offices(service_office_id) ON DELETE CASCADE,
  customer_id                BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  project_scope_description  VARCHAR(250) NOT NULL,
  status                     SMALLINT NOT NULL,
  creation_datetime          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_datetime           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE projects IS 'Project records linked to service offices and customers.';
COMMENT ON COLUMN projects.project_name IS 'Project name (max 100 chars).';
COMMENT ON COLUMN projects.service_office_id IS 'Reference to service office.';
COMMENT ON COLUMN projects.customer_id IS 'Reference to customer.';
COMMENT ON COLUMN projects.project_scope_description IS 'Project scope description (max 250 chars).';
COMMENT ON COLUMN projects.status IS 'Project status code.';
COMMENT ON COLUMN projects.creation_datetime IS 'Record creation timestamp.';
COMMENT ON COLUMN projects.updated_datetime IS 'Last update timestamp.';

CREATE INDEX IF NOT EXISTS idx_projects_service_office_id ON projects(service_office_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE OR REPLACE FUNCTION update_projects_updated_datetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_datetime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_updated_datetime ON projects;
CREATE TRIGGER trigger_projects_updated_datetime
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE update_projects_updated_datetime();
