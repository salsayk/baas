-- Incremental: contract modal strings for Contract User Fee integration.
-- Run: node database/run-sql.mjs database/Translations/add-contract-modal-contract-user-fee-translations.sql
--
-- Convention: add new translation deltas in new files; do not modify already-shipped scripts.

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Configure user fee', 'Configure user fee', 'הגדר דמי משתמש'),
    ('Contract user fee is configured', 'Contract user fee is configured', 'דמי חוזה משתמש הוגדרו'),
    ('At least one Contract user fee record is required before saving this contract', 'At least one Contract user fee record is required before saving this contract', 'נדרשת לפחות רשומת דמי חוזה משתמש אחת לפני שמירת חוזה זה'),
    ('Contract user fee', 'Contract user fee', 'דמי חוזה משתמש'),
    ('Close', 'Close', 'סגור')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
