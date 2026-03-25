-- Add Project modal translations (ProjectModal) for Hebrew
-- Run: node database/run-sql.mjs database/Translations/add-project-modal-translations.sql

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'customers'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Assign Contracts', 'Assign Contracts', 'הקצה חוזים'),
    ('No contracts for this customer', 'No contracts for this customer', 'אין חוזים ללקוח זה'),
    ('Select contracts for', 'Select contracts for', 'בחר חוזים עבור'),
    ('and drag to reorder', 'and drag to reorder', 'וגרור כדי לשנות סדר'),
    ('Loading contracts...', 'Loading contracts...', 'טוען חוזים...'),
    ('Saving...', 'Saving...', 'שומר...'),
    ('Drag to reorder', 'Drag to reorder', 'גרור כדי לשנות סדר'),
    ('Project Name', 'Project Name', 'שם פרויקט'),
    ('Customer', 'Customer', 'לקוח'),
    ('Project Scope Description', 'Project Scope Description', 'תיאור היקף הפרויקט'),
    ('Edit Project', 'Edit Project', 'עריכת פרויקט'),
    ('Add Project', 'Add Project', 'הוסף פרויקט'),
    ('Update project details', 'Update project details', 'עדכן פרטי הפרויקט'),
    ('Fill in details for the new project', 'Fill in details for the new project', 'מלא פרטים עבור הפרויקט החדש'),
    ('Select customer', 'Select customer', 'בחר לקוח'),
    ('Service Office', 'Service Office', 'משרד שירות'),
    ('Select service office', 'Select service office', 'בחר משרד שירות')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
