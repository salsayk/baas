-- ui_screens: registry of application/business screens
-- Depends on: languages table
-- Run: node database/run-sql.mjs database/screens/create-ui-screens-tables.sql

DROP TABLE IF EXISTS ui_screen_translations;
DROP TABLE IF EXISTS ui_screens;

CREATE TABLE ui_screens (
  screen_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  screen_name        VARCHAR(100) NOT NULL,
  screen_description VARCHAR(250)
);

CREATE UNIQUE INDEX idx_ui_screens_screen_name ON ui_screens(screen_name);
COMMENT ON TABLE ui_screens IS 'Application/business screens.';
COMMENT ON COLUMN ui_screens.screen_name IS 'Screen name (max 100 chars).';
COMMENT ON COLUMN ui_screens.screen_description IS 'Optional screen description (max 250 chars).';

-- Seed screens (screen_name = screen name)
INSERT INTO ui_screens (screen_name, screen_description) VALUES
  ('User', NULL),
  ('Account', NULL),
  ('Service Office', NULL),
  ('Customer', NULL),
  ('Contract', NULL),
  ('Project', NULL),
  ('Subcontractor', NULL),
  ('Subcontractor contract', NULL),
  ('Working session entry', NULL)
ON CONFLICT (screen_name) DO NOTHING;

-- ui_screen_translations: localized names and descriptions for screens
CREATE TABLE ui_screen_translations (
  screen_id    BIGINT NOT NULL REFERENCES ui_screens(screen_id) ON DELETE CASCADE,
  language_id  BIGINT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  description  VARCHAR(250),
  PRIMARY KEY (screen_id, language_id)
);

CREATE INDEX idx_ui_screen_translations_language_id ON ui_screen_translations(language_id);

COMMENT ON TABLE ui_screen_translations IS 'Localized screen names and descriptions.';

-- Seed Hebrew (language_id=2) translations
WITH screens AS (SELECT screen_id, screen_name FROM ui_screens),
     seed(screen_name, he_name) AS (
       VALUES
         ('User', 'משתמש'),
         ('Account', 'חשבון'),
         ('Service Office', 'משרד שירות'),
         ('Customer', 'לקוח'),
         ('Contract', 'חוזה'),
         ('Project', 'פרויקט'),
         ('Subcontractor', 'קבלן משנה'),
         ('Subcontractor contract', 'חוזה קבלן משנה'),
         ('Working session entry', 'רשומת סשן עבודה')
     )
INSERT INTO ui_screen_translations (screen_id, language_id, name, description)
SELECT s.screen_id, 2, COALESCE(seed.he_name, s.screen_name), NULL
FROM screens s
LEFT JOIN seed ON seed.screen_name = s.screen_name
ON CONFLICT (screen_id, language_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;
