-- Languages_Screens: registry of application screens for translation grouping
-- Depends on: (none)
-- Run: node database/run-sql.mjs database/Languages_Screens/create-languages-screens-table.sql

CREATE TABLE IF NOT EXISTS languages_screens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  screen_name TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_languages_screens_name ON languages_screens(screen_name);

COMMENT ON TABLE languages_screens IS 'Application screens for organizing UI translation labels.';

-- Seed screens available in the system
INSERT INTO languages_screens (screen_name) VALUES
  ('sidebar'),
  ('common'),
  ('home'),
  ('dashboards'),
  ('accounts'),
  ('service-offices'),
  ('customers'),
  ('contracts'),
  ('system-lookups'),
  ('languages'),
  ('language-labels'),
  ('playground'),
  ('use-cases'),
  ('protected'),
  ('auth-error')
ON CONFLICT (screen_name) DO NOTHING;
