-- Add missing translations for Success milestones grid/modal (contracts screen).
-- Run: node database/run-sql.mjs database/Translations/add-contract-success-milestones-translations.sql

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Configure Success Milestones', 'Configure Success Milestones', 'הגדר אבני דרך הצלחה'),
    ('Criteria', 'Criteria', 'קריטריון'),
    ('Type', 'Type', 'סוג'),
    ('Amount', 'Amount', 'סכום'),
    ('Percentage', 'Percentage', 'אחוז'),
    ('Fixed', 'Fixed', 'קבוע'),
    ('Milestone type', 'Milestone type', 'סוג אבן דרך'),
    ('Select milestone type', 'Select milestone type', 'בחר סוג אבן דרך'),
    ('Milestone type is required', 'Milestone type is required', 'נדרש סוג אבן דרך'),
    ('Milestone criteria is required', 'Milestone criteria is required', 'נדרש קריטריון אבן דרך'),
    ('Milestone percentage reference figure', 'Milestone percentage reference figure', 'ערך ייחוס לאחוז אבן דרך'),
    ('Milestone percentage reference figure description', 'Milestone percentage reference figure description', 'תיאור ערך ייחוס לאחוז אבן דרך'),
    ('Milestone percentage reference figure is required', 'Milestone percentage reference figure is required', 'נדרש ערך ייחוס לאחוז אבן דרך'),
    ('Milestone percentage reference figure description is required', 'Milestone percentage reference figure description is required', 'נדרש תיאור לערך ייחוס לאחוז אבן דרך'),
    ('Minimum payment amount', 'Minimum payment amount', 'סכום תשלום מינימלי'),
    ('Maximum payment amount', 'Maximum payment amount', 'סכום תשלום מקסימלי'),
    ('Maximum payment amount must be greater than or equal to minimum payment amount', 'Maximum payment amount must be greater than or equal to minimum payment amount', 'סכום תשלום מקסימלי חייב להיות גדול או שווה לסכום תשלום מינימלי'),
    ('Milestone created', 'Milestone created', 'אבן דרך נוצרה'),
    ('Milestone deleted', 'Milestone deleted', 'אבן דרך נמחקה'),
    ('Reorder failed', 'Reorder failed', 'סידור מחדש נכשל')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

