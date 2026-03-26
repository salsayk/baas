-- Weekday names for contracts screen (e.g. PP Proforma occasion / weekly recurrence). English + Hebrew.
-- Run: node database/run-sql.mjs database/Translations/add-contract-modal-sunday-translation.sql

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Sunday', 'Sunday', 'יום ראשון'),
    ('Monday', 'Monday', 'יום שני'),
    ('Tuesday', 'Tuesday', 'יום שלישי'),
    ('Wednesday', 'Wednesday', 'יום רביעי'),
    ('Thursday', 'Thursday', 'יום חמישי'),
    ('Friday', 'Friday', 'יום שישי'),
    ('Saturday', 'Saturday', 'יום שבת')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
