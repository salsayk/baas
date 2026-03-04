-- Create Service_Offices table for PostgreSQL
-- Run after accounts table exists (accounts must have account_id).
-- Example: psql -h localhost -p 5432 -U postgres -d postgres -f create-service-offices-table.sql

CREATE TABLE IF NOT EXISTS service_offices (
    service_office_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_office_name      VARCHAR(100) NOT NULL,
    service_office_description VARCHAR(250),
    account_id               BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    country                  CHAR(2),
    status                   SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (1, 2, 3)),
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN service_offices.status IS '1=Active, 2=Inactive, 3=Deleted';

CREATE INDEX IF NOT EXISTS idx_service_offices_account_id ON service_offices(account_id);
CREATE INDEX IF NOT EXISTS idx_service_offices_status ON service_offices(status);

CREATE OR REPLACE FUNCTION update_service_offices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_service_offices_updated_at ON service_offices;
CREATE TRIGGER trigger_service_offices_updated_at
    BEFORE UPDATE ON service_offices
    FOR EACH ROW
    EXECUTE PROCEDURE update_service_offices_updated_at();
