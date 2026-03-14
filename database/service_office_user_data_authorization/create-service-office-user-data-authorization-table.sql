-- Create service_office_users_data_authorization table for PostgreSQL
-- Run: node database/run-sql.mjs database/service_office_user_data_authorization/create-service-office-user-data-authorization-table.sql

CREATE TABLE IF NOT EXISTS service_office_users_data_authorization (
  auth_id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                   BIGINT NOT NULL,
  authorized_entity_type    INTEGER NOT NULL,
  entity_id                 BIGINT NOT NULL
);

COMMENT ON TABLE service_office_users_data_authorization IS 'Service office user data authorization records linking users to authorized entities.';
COMMENT ON COLUMN service_office_users_data_authorization.auth_id IS 'Primary key (auto-generated).';
COMMENT ON COLUMN service_office_users_data_authorization.user_id IS 'Reference to service office user.';
COMMENT ON COLUMN service_office_users_data_authorization.authorized_entity_type IS 'Type: 2=customer, 3=project, 4=contract, 100=all future customers, 101=all future projects for customer.';
COMMENT ON COLUMN service_office_users_data_authorization.entity_id IS 'Reference to entity.';

CREATE INDEX IF NOT EXISTS idx_service_office_users_data_authorization_user_id ON service_office_users_data_authorization(user_id);
CREATE INDEX IF NOT EXISTS idx_service_office_users_data_authorization_authorized_entity_type ON service_office_users_data_authorization(authorized_entity_type);
CREATE INDEX IF NOT EXISTS idx_service_office_users_data_authorization_entity_id ON service_office_users_data_authorization(entity_id);
