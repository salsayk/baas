-- Add customers screen and EN/HE labels
-- Run: node database/run-sql.mjs database/Translations/add-customers-screen-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('customers')
ON CONFLICT (screen_name) DO NOTHING;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'customers'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Customers', 'Customers', 'לקוחות'),
    ('By service office', 'By service office', 'לפי משרד שירות'),
    ('Select a service office to view and manage its customers', 'Select a service office to view and manage its customers', 'בחר משרד שירות לצפייה וניהול לקוחותיו'),
    ('Select service office', 'Select service office', 'בחר משרד שירות'),
    ('Add Customer', 'Add Customer', 'הוסף לקוח'),
    ('Loading customers...', 'Loading customers...', 'טוען לקוחות...'),
    ('Select a service office to view customers', 'Select a service office to view customers', 'בחר משרד שירות כדי לצפות בלקוחות'),
    ('No customers yet. Add one for this service office.', 'No customers yet. Add one for this service office.', 'אין עדיין לקוחות. הוסף אחד עבור משרד שירות זה.'),
    ('Legal ID', 'Legal ID', 'מזהה משפטי'),
    ('Address Country', 'Address Country', 'מדינת כתובת'),
    ('Address City', 'Address City', 'עיר'),
    ('Address Street', 'Address Street', 'רחוב'),
    ('Address Street Number', 'Address Street Number', 'מספר בית'),
    ('Address Zip Code', 'Address Zip Code', 'מיקוד'),
    ('Edit Customer', 'Edit Customer', 'עריכת לקוח')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- Sidebar + service-office labels are stored under existing screens
WITH side AS (
  SELECT id FROM languages_screens WHERE screen_name = 'sidebar'
),
svc AS (
  SELECT id FROM languages_screens WHERE screen_name = 'service-offices'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(screen_name, source_text, en_text, he_text) AS (
  VALUES
    ('sidebar', 'Customers', 'Customers', 'לקוחות'),
    ('service-offices', 'Manage customers', 'Manage customers', 'ניהול לקוחות')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT CASE WHEN seed.screen_name = 'sidebar' THEN side.id ELSE svc.id END,
       seed.source_text,
       l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN side
CROSS JOIN svc
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
