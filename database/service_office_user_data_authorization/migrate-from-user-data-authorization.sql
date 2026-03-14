-- Migrate from user_data_authorization to service_office_users_data_authorization
-- Renames table and updates entity type values: 0->2 (customers), 1->3 (projects), 2->4 (contracts)
-- Run: node database/run-sql.mjs database/service_office_user_data_authorization/migrate-from-user-data-authorization.sql

-- Rename table (may be user_data_authorization or service_office_user_data_authorization)
ALTER TABLE IF EXISTS user_data_authorization RENAME TO service_office_users_data_authorization;

-- Update entity types: 0->2, 1->3, 2->4 (100 and 101 stay as is)
UPDATE service_office_users_data_authorization SET authorized_entity_type = 2 WHERE authorized_entity_type = 0;
UPDATE service_office_users_data_authorization SET authorized_entity_type = 3 WHERE authorized_entity_type = 1;
UPDATE service_office_users_data_authorization SET authorized_entity_type = 4 WHERE authorized_entity_type = 2;

-- Rename indexes
DROP INDEX IF EXISTS idx_user_data_authorization_user_id;
DROP INDEX IF EXISTS idx_user_data_authorization_authorized_entity_type;
DROP INDEX IF EXISTS idx_user_data_authorization_entity_id;
DROP INDEX IF EXISTS idx_service_office_user_data_authorization_user_id;
DROP INDEX IF EXISTS idx_service_office_user_data_authorization_authorized_entity_type;
DROP INDEX IF EXISTS idx_service_office_user_data_authorization_entity_id;

CREATE INDEX IF NOT EXISTS idx_service_office_users_data_authorization_user_id ON service_office_users_data_authorization(user_id);
CREATE INDEX IF NOT EXISTS idx_service_office_users_data_authorization_authorized_entity_type ON service_office_users_data_authorization(authorized_entity_type);
CREATE INDEX IF NOT EXISTS idx_service_office_users_data_authorization_entity_id ON service_office_users_data_authorization(entity_id);
