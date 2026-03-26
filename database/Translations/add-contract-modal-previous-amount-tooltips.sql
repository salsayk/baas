-- Incremental: Previous / Next tab navigation labels and contract amount tooltips by type id (Hebrew).
-- Prerequisites: languages_screens 'contracts' exists; prior contract translation scripts applied.
-- Run: node database/run-sql.mjs database/Translations/add-contract-modal-previous-amount-tooltips.sql

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Previous', 'Previous', 'הקודם'),
    ('Next', 'Next', 'הבא'),
    ('Greater than 0. Reflects contract total amount.', 'Greater than 0. Reflects contract total amount.', 'גדול מ-0. משקף את סכום החוזה הכולל.'),
    ('Irrelevant.', 'Irrelevant.', 'לא רלוונטי.'),
    ('Greater than 0. Reflects contract periodical payment amount, and not contract total amount.', 'Greater than 0. Reflects contract periodical payment amount, and not contract total amount.', 'גדול מ-0. משקף את סכום התשלום התקופתי ולא את סכום החוזה הכולל.'),
    ('Contract amount guidance', 'Contract amount guidance', 'הנחיה לשדה סכום החוזה')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
