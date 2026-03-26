-- Incremental: contract modal wizard buttons, client validation, and API error strings (Hebrew).
-- Prerequisites: languages_screens 'contracts' exists; add-contract-modal-translations.sql (and related) already applied.
-- Run: node database/run-sql.mjs database/Translations/add-contract-modal-translations-wizard-validation.sql
--
-- Convention: add new translation deltas ONLY in new files like this; do not append to already-shipped scripts.

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Next', 'Next', 'הבא'),
    ('Contract name is required', 'Contract name is required', 'שם חוזה נדרש'),
    ('Customer is required', 'Customer is required', 'לקוח נדרש'),
    ('Contract type is required', 'Contract type is required', 'סוג חוזה נדרש'),
    ('Status is required', 'Status is required', 'סטטוס נדרש'),
    ('Contract start date is required', 'Contract start date is required', 'תאריך תחילת חוזה נדרש'),
    ('Contract amount value must be greater than 0', 'Contract amount value must be greater than 0', 'סכום החוזה חייב להיות גדול מ-0'),
    ('Contract currency is required', 'Contract currency is required', 'מטבע חוזה נדרש'),
    ('PP Proforma recurrence is required', 'PP Proforma recurrence is required', 'נדרשת מחזוריות תשלומים'),
    ('PP Proforma occasion is required', 'PP Proforma occasion is required', 'נדרש מועד תשלום מחזורי'),
    ('PP Initial payment reached indicator is required', 'PP Initial payment reached indicator is required', 'נדרשת בקרת חציית סף תשלום ראשוני במשך כל תקופת החוזה'),
    ('PP Initial amount value is required', 'PP Initial amount value is required', 'נדרש ערך סף תשלום ראשוני במשך כל תקופת החוזה'),
    ('PP Upper cap reached indicator is required', 'PP Upper cap reached indicator is required', 'נדרשת בקרת חציית סף תשלום מקסימלי במשך כל תקופת החוזה'),
    ('PP Upper cap amount value is required', 'PP Upper cap amount value is required', 'נדרש ערך סף תשלום מקסימלי במשך כל תקופת החוזה'),
    ('PP recurrence Initial payment reached indicator is required', 'PP recurrence Initial payment reached indicator is required', 'נדרשת בקרת חציית סף תשלום ראשוני במהלך מחזורי התשלום'),
    ('PP recurrence Initial amount value is required', 'PP recurrence Initial amount value is required', 'נדרש ערך סף תשלום ראשוני במהלך מחזורי התשלום'),
    ('PP recurrence Upper cap reached indicator is required', 'PP recurrence Upper cap reached indicator is required', 'נדרשת בקרת חציית סף תשלום מקסימלי במהלך מחזורי התשלום'),
    ('PP recurrence Upper cap amount value is required', 'PP recurrence Upper cap amount value is required', 'נדרש ערך סף תשלום מקסימלי במהלך מחזורי התשלום'),
    ('Service office is required', 'Service office is required', 'משרד שירות נדרש'),
    ('Contract amount value is required and must be greater than 0', 'Contract amount value is required and must be greater than 0', 'סכום החוזה נדרש וחייב להיות גדול מ-0'),
    ('Failed to create contract', 'Failed to create contract', 'יצירת החוזה נכשלה'),
    ('Failed to update contract', 'Failed to update contract', 'עדכון החוזה נכשל'),
    ('Failed to delete contract', 'Failed to delete contract', 'מחיקת החוזה נכשלה'),
    ('Operation failed', 'Operation failed', 'הפעולה נכשלה'),
    ('Delete failed', 'Delete failed', 'המחיקה נכשלה'),
    ('Contract name cannot be empty', 'Contract name cannot be empty', 'שם החוזה לא יכול להיות ריק'),
    ('Contract not found', 'Contract not found', 'החוזה לא נמצא'),
    ('No valid fields to update', 'No valid fields to update', 'אין שדות לעדכון'),
    ('Unauthorized. Please sign in.', 'Unauthorized. Please sign in.', 'נדרשת התחברות. אנא התחבר.'),
    ('Invalid contract ID', 'Invalid contract ID', 'מזהה חוזה לא תקין'),
    ('Customer not found in the selected service office or access denied', 'Customer not found in the selected service office or access denied', 'הלקוח לא נמצא במשרד השירות שנבחר או אין הרשאה')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
