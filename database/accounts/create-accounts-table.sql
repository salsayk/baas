-- Create Accounts table for PostgreSQL
-- Run this in your database (e.g. psql or SQL Editor)
-- Example: psql -h localhost -p 5432 -U postgres -d postgres -f create-accounts-table.sql

CREATE TABLE IF NOT EXISTS accounts (
    account_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id           UUID NOT NULL,
    account_name      VARCHAR(100) NOT NULL,
    mobile_phone      VARCHAR(20),
    secondary_phone   VARCHAR(20),
    email_address     VARCHAR(255) NOT NULL,,
    
    -- Credit card information (encrypt and protect in production for PCI compliance)
    card_holder_name  VARCHAR(100),
    card_number       VARCHAR(19),
    card_expiry_month SMALLINT,
    card_expiry_year  SMALLINT,
    card_last_four    CHAR(4),
    card_cvv          VARCHAR(4),
    
    status            SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (1, 2, 3)),
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for status values
COMMENT ON COLUMN accounts.status IS '1=Active, 2=Inactive, 3=Deleted';

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email_address);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- Trigger to auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON accounts;
CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Optional migration helpers if the table already exists:
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS card_cvv VARCHAR(4);
-- CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
