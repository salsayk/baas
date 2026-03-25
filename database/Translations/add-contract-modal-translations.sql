-- Add/update Contract modal translations with user-provided Hebrew
-- Run: node database/run-sql.mjs database/Translations/add-contract-modal-translations.sql

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('PP Proforma', 'PP Proforma', 'תשלומים'),
    ('Contract Details', 'Contract Details', 'פרטי חוזה'),
    ('Contract Description', 'Contract Description', 'תיאור חוזה'),
    ('Contract Type', 'Contract Type', 'סוג חוזה'),
    ('Contract start date', 'Contract start date', 'תאריך תחילת חוזה'),
    ('Contract optional end date', 'Contract optional end date', 'תאריך סיום חוזה'),
    ('Contract amount value', 'Contract amount value', 'סכום חוזה'),
    ('Contract currency', 'Contract currency', 'מטבע'),
    ('PP Proforma recurrence', 'PP Proforma recurrence', 'מחזוריות תשלומים'),
    ('PP Proforma occasion', 'PP Proforma occasion', 'מועד תשלום מחזורי'),
    ('PP Initial payment reached indicator', 'PP Initial payment reached indicator', 'בקרת חציית סף תשלום ראשוני במשך כל תקופת החוזה'),
    ('PP Initial amount value', 'PP Initial amount value', 'ערך סף תשלום ראשוני במשך כל תקופת החוזה'),
    ('PP Upper cap reached indicator', 'PP Upper cap reached indicator', 'בקרת חציית סף תשלום מקסימלי במשך כל תקופת החוזה'),
    ('PP Upper cap amount value', 'PP Upper cap amount value', 'ערך סף תשלום מקסימלי במשך כל תקופת החוזה'),
    ('PP recurrence Initial payment reached indicator', 'PP recurrence Initial payment reached indicator', 'בקרת חציית סף תשלום ראשוני במהלך מחזורי התשלום'),
    ('PP recurrence Initial amount value', 'PP recurrence Initial amount value', 'ערך סף תשלום ראשוני במהלך מחזורי התשלום'),
    ('PP recurrence Upper cap reached indicator', 'PP recurrence Upper cap reached indicator', 'בקרת חציית סף תשלום מקסימלי במהלך מחזורי התשלום'),
    ('PP recurrence Upper cap amount value', 'PP recurrence Upper cap amount value', 'ערך סף תשלום מקסימלי במהלך מחזורי התשלום')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
