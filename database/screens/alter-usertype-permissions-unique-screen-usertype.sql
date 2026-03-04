-- Alter ui_screen_usertype_permissions: unique (screen_id, user_type) instead of (screen_id, user_type, permission)
-- Run: node database/run-sql.mjs database/screens/alter-usertype-permissions-unique-screen-usertype.sql
-- Each screen_id + user_type can appear only once.

-- Remove duplicates if any (keep one row per screen_id, user_type with highest permission)
DELETE FROM ui_screen_usertype_permissions a
USING ui_screen_usertype_permissions b
WHERE a.screen_id = b.screen_id AND a.user_type = b.user_type
  AND a.permission < b.permission;

-- Drop old PK and add new one
ALTER TABLE ui_screen_usertype_permissions DROP CONSTRAINT IF EXISTS ui_screen_usertype_permissions_pkey;
ALTER TABLE ui_screen_usertype_permissions ADD PRIMARY KEY (screen_id, user_type);
