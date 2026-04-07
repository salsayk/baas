-- Translation for active-per-type validation (subscriptions offers API).
-- Run: node database/run-sql.mjs database/Translations/add-subscriptions-offers-active-type-conflict-translation.sql

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'subscriptions-offers'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    (
      'Only one active subscription offer is allowed per offer type.',
      'Only one active subscription offer is allowed per offer type.',
      'מותרת רק הצעת מנוי פעילה אחת לכל סוג הצעה.'
    )
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
