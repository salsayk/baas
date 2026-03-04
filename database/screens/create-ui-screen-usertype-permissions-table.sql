-- ui_screen_usertype_permissions: permissions per screen and user type
-- Run: node database/run-sql.mjs database/screens/create-ui-screen-usertype-permissions-table.sql

DROP TABLE IF EXISTS ui_screen_usertype_permissions;

CREATE TABLE ui_screen_usertype_permissions (
  screen_id   BIGINT NOT NULL,
  user_type   BIGINT NOT NULL,
  permission  BIGINT NOT NULL,
  PRIMARY KEY (screen_id, user_type)
);

COMMENT ON TABLE ui_screen_usertype_permissions IS 'Permissions per screen and user type.';
COMMENT ON COLUMN ui_screen_usertype_permissions.screen_id IS 'Reference to ui_screens.';
COMMENT ON COLUMN ui_screen_usertype_permissions.user_type IS 'User type identifier.';
COMMENT ON COLUMN ui_screen_usertype_permissions.permission IS 'Permission level (e.g. 0=none, 2=full).';

INSERT INTO ui_screen_usertype_permissions (screen_id, user_type, permission) VALUES
  (1, 0, 2),
  (1, 1, 2),
  (1, 2, 0),
  (2, 0, 2),
  (3, 0, 2),
  (3, 1, 2),
  (4, 0, 2),
  (4, 1, 2),
  (4, 2, 0),
  (4, 3, 0),
  (5, 0, 2),
  (5, 1, 2),
  (5, 2, 0),
  (5, 3, 0),
  (6, 0, 2),
  (6, 1, 2),
  (6, 2, 0),
  (6, 3, 0),
  (7, 0, 2),
  (7, 1, 2),
  (7, 2, 0),
  (7, 3, 0),
  (8, 0, 2),
  (8, 1, 2),
  (8, 2, 0),
  (8, 3, 0),
  (9, 0, 2),
  (9, 1, 2),
  (9, 2, 2),
  (9, 3, 2),
  (9, 4, 2);
