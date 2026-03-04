-- Migrate existing ui_translations table to languages_screens_translations (preserves data)
-- Run: node database/run-sql.mjs database/Translations/rename-ui-translations-to-languages-screens-translations.sql
-- Use this when ui_translations already exists and you want to rename without losing data.
-- For fresh installs, use recreate-ui-translations-with-screen-id.sql instead.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ui_translations'
  ) THEN
    ALTER TABLE ui_translations RENAME TO languages_screens_translations;

    -- Rename indexes if they exist (legacy schema may have different index names)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ui_translations_language_id') THEN
      ALTER INDEX idx_ui_translations_language_id RENAME TO idx_languages_screens_translations_language_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ui_translations_source_text') THEN
      ALTER INDEX idx_ui_translations_source_text RENAME TO idx_languages_screens_translations_source_text;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ui_translations_screen_id') THEN
      ALTER INDEX idx_ui_translations_screen_id RENAME TO idx_languages_screens_translations_screen_id;
    END IF;
  END IF;
END $$;
