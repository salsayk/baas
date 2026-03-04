-- API keys table (PostgreSQL) - mirrors Supabase api_keys structure
-- Run once, e.g.: node database/run-sql.mjs database/api_keys/create-api-keys-table.sql

CREATE TABLE IF NOT EXISTS api_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  name       VARCHAR(255) NOT NULL,
  key        VARCHAR(255) NOT NULL UNIQUE,
  type       VARCHAR(10) NOT NULL DEFAULT 'dev' CHECK (type IN ('dev', 'prod')),
  usage      INTEGER DEFAULT 0,
  "limit"    INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

COMMENT ON TABLE api_keys IS 'API keys per user (user_id from Supabase auth); scoped by app in API routes.';
