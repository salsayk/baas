-- Email verification codes for account email validation
-- Run once (e.g. psql or your SQL client)

CREATE TABLE IF NOT EXISTS email_verification_codes (
    email      VARCHAR(255) NOT NULL PRIMARY KEY,
    code       CHAR(6)      NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires
ON email_verification_codes(expires_at);

COMMENT ON TABLE email_verification_codes IS 'Temporary 6-digit codes for account email verification; clean expired rows periodically.';
