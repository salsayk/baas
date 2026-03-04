-- Rename ui_screens.lookup_table_name to screen_name (preserves data)
-- Run: node database/run-sql.mjs database/screens/rename-lookup-table-name-to-screen-name.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ui_screens' AND column_name = 'lookup_table_name'
  ) THEN
    ALTER TABLE ui_screens RENAME COLUMN lookup_table_name TO screen_name;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ui_screens_lookup_table_name') THEN
      DROP INDEX idx_ui_screens_lookup_table_name;
      CREATE UNIQUE INDEX idx_ui_screens_screen_name ON ui_screens(screen_name);
    END IF;
  END IF;
END $$;
