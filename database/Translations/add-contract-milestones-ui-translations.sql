-- Incremental: contracts — milestone configuration modal and form (EN/HE).
-- Run: node database/run-sql.mjs database/Translations/add-contract-milestones-ui-translations.sql

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'contracts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Configure Milestones', 'Configure Milestones', 'הגדר אבני דרך'),
    ('Add milestone', 'Add milestone', 'הוסף אבן דרך'),
    ('Edit milestone', 'Edit milestone', 'ערוך אבן דרך'),
    ('Update milestone details', 'Update milestone details', 'עדכן פרטי אבן דרך'),
    ('Fill in milestone details', 'Fill in milestone details', 'מלא פרטי אבן דרך'),
    ('Milestone amount is required', 'Milestone amount is required', 'נדרש סכום לאבן הדרך'),
    ('Milestone percentage is required', 'Milestone percentage is required', 'נדרש אחוז לאבן הדרך'),
    ('Milestone percentage must be between 0 and 100', 'Milestone percentage must be between 0 and 100', 'אחוז אבן הדרך חייב להיות בין 0 ל-100'),
    ('Milestone condition met indicator is required', 'Milestone condition met indicator is required', 'נדרש אינדיקטור עמידה בתנאי'),
    ('Milestone amount', 'Milestone amount', 'סכום אבן דרך'),
    ('Milestone percentage', 'Milestone percentage', 'אחוז אבן דרך'),
    ('Milestone criteria', 'Milestone criteria', 'קריטריונים לאבן דרך'),
    ('Milestone due date', 'Milestone due date', 'תאריך יעד'),
    ('Progress status', 'Progress status', 'סטטוס התקדמות'),
    ('Milestone condition met indicator', 'Milestone condition met indicator', 'אינדיקטור עמידה בתנאי'),
    ('Progress status date', 'Progress status date', 'תאריך סטטוס התקדמות'),
    ('Milestone met date', 'Milestone met date', 'תאריך השלמת אבן דרך'),
    ('Progress status user id', 'Progress status user id', 'מזהה משתמש לסטטוס התקדמות'),
    ('Milestone met mark user id', 'Milestone met mark user id', 'מזהה משתמש לסימון השלמה'),
    ('Milestone #', 'Milestone #', 'אבן דרך מס׳'),
    ('Loading milestones...', 'Loading milestones...', 'טוען אבני דרך...'),
    ('No milestones configured yet for this contract.', 'No milestones configured yet for this contract.', 'לא הוגדרו אבני דרך לחוזה זה.'),
    ('Milestone', 'Milestone', 'אבן דרך'),
    ('Failed to fetch milestones', 'Failed to fetch milestones', 'טעינת אבני הדרך נכשלה'),
    ('Failed to update milestone', 'Failed to update milestone', 'עדכון אבן הדרך נכשל'),
    ('Failed to create milestone', 'Failed to create milestone', 'יצירת אבן הדרך נכשלה'),
    ('Failed to delete milestone', 'Failed to delete milestone', 'מחיקת אבן הדרך נכשלה'),
    ('Drag to reorder', 'Drag to reorder', 'גרור לסידור מחדש'),
    ('Failed to reorder milestones', 'Failed to reorder milestones', 'סידור מחדש של אבני הדרך נכשל'),
    ('Total milestone amounts cannot exceed the contract amount.', 'Total milestone amounts cannot exceed the contract amount.', 'סכום אבני הדרך הכולל אינו יכול לעלות על סכום החוזה.'),
    ('Total milestone percentages cannot exceed 100%.', 'Total milestone percentages cannot exceed 100%.', 'סכום אחוזי אבני הדרך אינו יכול לעלות על 100%.'),
    ('Amount and percentage stay in sync with the contract total.', 'Amount and percentage stay in sync with the contract total.', 'הסכום והאחוז מתעדכנים בהתאם לסכום החוזה.'),
    ('Remaining', 'Remaining', 'נותר'),
    ('Shows how much of the contract amount is still unallocated after all milestones including this one.', 'Shows how much of the contract amount is still unallocated after all milestones including this one.', 'מציג כמה מסכום החוזה עדיין לא מוקצה לאחר כל אבני הדרך, כולל הנוכחית.'),
    ('Shows how many percentage points are still available across all milestones (maximum 100% in total).', 'Shows how many percentage points are still available across all milestones (maximum 100% in total).', 'מציג כמה נקודות אחוז עדיין פנויות לכל אבני הדרך (סה״כ עד 100%).')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
