-- Create user_data_authorization table for PostgreSQL
-- Run: node database/run-sql.mjs database/user_data_authorization/create-user-data-authorization-table.sql

CREATE TABLE IF NOT EXISTS user_data_authorization (
  auth_id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                   BIGINT NOT NULL,
  authorized_entity_type    INTEGER NOT NULL,
  entity_id                 BIGINT NOT NULL
);

COMMENT ON TABLE user_data_authorization IS 'User data authorization records linking users to authorized entities.';
COMMENT ON COLUMN user_data_authorization.auth_id IS 'Primary key (auto-generated).';
COMMENT ON COLUMN user_data_authorization.user_id IS 'Reference to user.';
COMMENT ON COLUMN user_data_authorization.authorized_entity_type IS 'Type of authorized entity.';
COMMENT ON COLUMN user_data_authorization.entity_id IS 'Reference to entity.';

CREATE INDEX IF NOT EXISTS idx_user_data_authorization_user_id ON user_data_authorization(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_authorization_authorized_entity_type ON user_data_authorization(authorized_entity_type);
CREATE INDEX IF NOT EXISTS idx_user_data_authorization_entity_id ON user_data_authorization(entity_id);
