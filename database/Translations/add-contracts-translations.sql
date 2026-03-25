-- Add contracts screen and EN/HE labels
-- Run: node database/run-sql.mjs database/Translations/add-contracts-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('contracts')
ON CONFLICT (screen_name) DO NOTHING;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE language_name IN ('English', 'עברית') OR id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Contracts', 'Contracts', 'חוזים'),
    ('By service office', 'By service office', 'לפי משרד שירות'),
    ('Select a service office to view and manage its contracts', 'Select a service office to view and manage its contracts', 'בחר משרד שירות לצפייה וניהול החוזים שלו'),
    ('Select service office', 'Select service office', 'בחר משרד שירות'),
    ('Add Contract', 'Add Contract', 'הוסף חוזה'),
    ('Loading contracts...', 'Loading contracts...', 'טוען חוזים...'),
    ('Select a service office to view contracts', 'Select a service office to view contracts', 'בחר משרד שירות כדי לצפות בחוזים'),
    ('No contracts yet. Add one for this service office.', 'No contracts yet. Add one for this service office.', 'אין עדיין חוזים. הוסף אחד עבור משרד שירות זה.'),
    ('Contract Name', 'Contract Name', 'שם חוזה'),
    ('Customer', 'Customer', 'לקוח'),
    ('Start Date', 'Start Date', 'תאריך התחלה'),
    ('Edit Contract', 'Edit Contract', 'עריכת חוזה'),
    ('Fill in details for the new contract', 'Fill in details for the new contract', 'מלא את הפרטים לחוזה החדש'),
    ('Update contract details', 'Update contract details', 'עדכן את פרטי החוזה'),
    ('Contract Details', 'Contract Details', 'פרטי חוזה'),
    ('PP Proforma', 'PP Proforma', 'תשלומים'),
    ('Contract Description', 'Contract Description', 'תיאור חוזה'),
    ('Contract Type', 'Contract Type', 'סוג חוזה'),
    ('Select customer', 'Select customer', 'בחר לקוח'),
    ('Select contract type', 'Select contract type', 'בחר סוג חוזה'),
    ('Contract Start Date', 'Contract Start Date', 'תאריך התחלת חוזה'),
    ('Contract Optional End Date', 'Contract Optional End Date', 'תאריך סיום אופציונלי'),
    ('Contract Amount Value', 'Contract Amount Value', 'ערך סכום חוזה'),
    ('Contract Currency', 'Contract Currency', 'מטבע חוזה'),
    ('Select currency', 'Select currency', 'בחר מטבע'),
    ('PP Proforma Recurrence', 'PP Proforma Recurrence', 'תדירות Proforma'),
    ('Select recurrence', 'Select recurrence', 'בחר תדירות'),
    ('PP Proforma Occasion', 'PP Proforma Occasion', 'אירוע Proforma'),
    ('PP Initial Payment Reached Indicator', 'PP Initial Payment Reached Indicator', 'אינדיקציית תשלום התחלתי'),
    ('PP Initial Amount Value', 'PP Initial Amount Value', 'ערך סכום התחלתי'),
    ('PP Upper Cap Reached Indicator', 'PP Upper Cap Reached Indicator', 'אינדיקציית הגעה למכסה עליונה'),
    ('PP Upper Cap Amount Value', 'PP Upper Cap Amount Value', 'ערך מכסה עליונה'),
    ('PP Recurrence Initial Payment Reached Indicator', 'PP Recurrence Initial Payment Reached Indicator', 'אינדיקציית תשלום התחלתי בתדירות'),
    ('PP Recurrence Initial Amount Value', 'PP Recurrence Initial Amount Value', 'ערך סכום התחלתי בתדירות'),
    ('PP Recurrence Upper Cap Reached Indicator', 'PP Recurrence Upper Cap Reached Indicator', 'אינדיקציית מכסה עליונה בתדירות'),
    ('PP Recurrence Upper Cap Amount Value', 'PP Recurrence Upper Cap Amount Value', 'ערך מכסה עליונה בתדירות'),
    ('Yes', 'Yes', 'כן'),
    ('No', 'No', 'לא'),
    ('Save', 'Save', 'שמור'),
    ('Update', 'Update', 'עדכן'),
    ('Active', 'Active', 'פעיל'),
    ('Inactive', 'Inactive', 'לא פעיל'),
    ('Deleted', 'Deleted', 'נמחק'),
    ('Unknown', 'Unknown', 'לא ידוע')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- Sidebar: Contracts
WITH side AS (
  SELECT id FROM languages_screens WHERE screen_name = 'sidebar'
),
langs AS (
  SELECT id, direction FROM languages WHERE language_name IN ('English', 'עברית') OR id IN (1, 2)
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT side.id, 'Contracts', l.id,
       CASE WHEN l.direction = 0 THEN 'Contracts' ELSE 'חוזים' END
FROM langs l
CROSS JOIN side
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
