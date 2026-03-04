-- Create service_office_users table for PostgreSQL
-- Depends on: service_offices table, subcontractors table
-- Run: node database/run-sql.mjs database/service_office_users/create-service-office-users-table.sql

CREATE TABLE IF NOT EXISTS service_office_users (
  service_office_user_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_name                 VARCHAR(100) NOT NULL,
  user_type                 SMALLINT NOT NULL,
  user_professional_grade   SMALLINT NOT NULL,
  service_office_id         BIGINT NOT NULL REFERENCES service_offices(service_office_id) ON DELETE CASCADE,
  subcontractor_id          BIGINT REFERENCES subcontractors(subcontractor_id) ON DELETE SET NULL,
  mobile_phone              VARCHAR(20) NOT NULL,
  secondary_phone           VARCHAR(20),
  email_address             VARCHAR(255) NOT NULL,
  status                    SMALLINT NOT NULL,
  password                  VARCHAR(100),
  last_password_change      DATE,
  creation_datetime         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_datetime          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE service_office_users IS 'Users linked to service offices, optionally to subcontractors.';
COMMENT ON COLUMN service_office_users.user_name IS 'User name (max 100 chars).';
COMMENT ON COLUMN service_office_users.user_type IS 'User type code.';
COMMENT ON COLUMN service_office_users.user_professional_grade IS 'User professional grade code.';
COMMENT ON COLUMN service_office_users.service_office_id IS 'Reference to service office.';
COMMENT ON COLUMN service_office_users.subcontractor_id IS 'Optional reference to subcontractor.';
COMMENT ON COLUMN service_office_users.mobile_phone IS 'Mobile phone (max 20 chars).';
COMMENT ON COLUMN service_office_users.secondary_phone IS 'Secondary phone (max 20 chars).';
COMMENT ON COLUMN service_office_users.email_address IS 'Email address (max 255 chars).';
COMMENT ON COLUMN service_office_users.status IS 'User status code.';
COMMENT ON COLUMN service_office_users.password IS 'Password hash (max 100 chars).';
COMMENT ON COLUMN service_office_users.last_password_change IS 'Date of last password change.';
COMMENT ON COLUMN service_office_users.creation_datetime IS 'Record creation timestamp.';
COMMENT ON COLUMN service_office_users.updated_datetime IS 'Last update timestamp.';

CREATE INDEX IF NOT EXISTS idx_service_office_users_service_office_id ON service_office_users(service_office_id);
CREATE INDEX IF NOT EXISTS idx_service_office_users_subcontractor_id ON service_office_users(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_service_office_users_status ON service_office_users(status);
CREATE INDEX IF NOT EXISTS idx_service_office_users_email_address ON service_office_users(email_address);

CREATE OR REPLACE FUNCTION update_service_office_users_updated_datetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_datetime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_service_office_users_updated_datetime ON service_office_users;
CREATE TRIGGER trigger_service_office_users_updated_datetime
  BEFORE UPDATE ON service_office_users
  FOR EACH ROW
  EXECUTE PROCEDURE update_service_office_users_updated_datetime();
