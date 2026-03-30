-- Add/update UI screen + sidebar translations for "user contract fee"
-- Run: node database/run-sql.mjs database/Translations/add-user-contract-fee-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('user-contract-fee')
ON CONFLICT (screen_name) DO NOTHING;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'user-contract-fee'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('User contract fee', 'User contract fee', 'דמי חוזה משתמש'),
    ('Select service office', 'Select service office', 'בחר משרד שירות'),
    ('Select customer', 'Select customer', 'בחר לקוח'),
    ('User Professional Grade', 'User Professional Grade', 'דרגה מקצועית של המשתמש'),
    ('Add User Contract fee', 'Add User Contract fee', 'הוסף דמי חוזה משתמש'),
    ('Edit User Contract fee', 'Edit User Contract fee', 'עריכת דמי חוזה משתמש'),
    ('Update user contract fee details', 'Update user contract fee details', 'עדכון פרטי דמי חוזה משתמש'),
    ('Fill in user contract fee details', 'Fill in user contract fee details', 'מלא פרטי דמי חוזה משתמש'),
    ('Select grade', 'Select grade', 'בחר דרגה'),
    ('User hourly rate', 'User hourly rate', 'תעריף שעתי של המשתמש'),
    ('User hourly rate discount', 'User hourly rate discount', 'הנחת תעריף שעתי של המשתמש'),
    ('Loading fees...', 'Loading fees...', 'טוען דמי משתמש...'),
    ('Select a contract to view fees', 'Select a contract to view fees', 'בחר חוזה לצפייה בדמי משתמש'),
    ('No user contract fee entries yet for this contract.', 'No user contract fee entries yet for this contract.', 'אין עדיין רשומות דמי חוזה משתמש עבור חוזה זה'),
    ('Select contract', 'Select contract', 'בחר חוזה'),
    ('User contract fee details', 'User contract fee details', 'פרטי דמי חוזה משתמש'),
    ('Actions', 'Actions', 'פעולות'),
    ('Edit', 'Edit', 'ערוך'),
    ('Delete', 'Delete', 'מחק'),
    ('Confirm', 'Confirm', 'אישור'),
    ('Cancel', 'Cancel', 'ביטול'),
    ('Create', 'Create', 'צור'),
    ('Update', 'Update', 'עדכן'),
    ('User professional grade is required', 'User professional grade is required', 'נדרשת דרגה מקצועית של המשתמש'),
    ('User hourly rate is required', 'User hourly rate is required', 'נדרש תעריף שעתי של המשתמש'),
    ('User hourly rate must be >= 0', 'User hourly rate must be >= 0', 'תעריף שעתי של המשתמש חייב להיות גדול או שווה ל-0'),
    ('User hourly rate discount is required', 'User hourly rate discount is required', 'נדרשת הנחת תעריף שעתי של המשתמש'),
    ('User hourly rate discount must be between 0 and 100', 'User hourly rate discount must be between 0 and 100', 'הנחת תעריף שעתי חייבת להיות בין 0 ל-100'),
    ('Failed to fetch service offices', 'Failed to fetch service offices', 'טעינת משרדי השירות נכשלה'),
    ('Failed to fetch customers', 'Failed to fetch customers', 'טעינת הלקוחות נכשלה'),
    ('Failed to fetch contracts', 'Failed to fetch contracts', 'טעינת החוזים נכשלה'),
    ('Failed to fetch user contract fees', 'Failed to fetch user contract fees', 'טעינת דמי חוזה משתמש נכשלה'),
    ('Failed to create', 'Failed to create', 'היצירה נכשלה'),
    ('Failed to update', 'Failed to update', 'העדכון נכשל'),
    ('Save failed', 'Save failed', 'השמירה נכשלה'),
    ('Failed to delete', 'Failed to delete', 'המחיקה נכשלה'),
    ('Delete failed', 'Delete failed', 'המחיקה נכשלה'),
    ('A contract user fee entry for this professional grade already exists', 'A contract user fee entry for this professional grade already exists', 'כבר קיימת רשומת דמי חוזה משתמש עבור דרגה מקצועית זו'),
    ('contract_id is required', 'contract_id is required', 'נדרש מזהה חוזה'),
    ('user_professional_grade is required', 'user_professional_grade is required', 'נדרשת דרגה מקצועית של המשתמש'),
    ('user_hourly_rate is required', 'user_hourly_rate is required', 'נדרש תעריף שעתי של המשתמש'),
    ('user_hourly_rate_discount is required', 'user_hourly_rate_discount is required', 'נדרשת הנחת תעריף שעתי של המשתמש'),
    ('user_hourly_rate must be >= 0', 'user_hourly_rate must be >= 0', 'תעריף שעתי של המשתמש חייב להיות גדול או שווה ל-0'),
    ('user_hourly_rate_discount must be between 0 and 100', 'user_hourly_rate_discount must be between 0 and 100', 'הנחת תעריף שעתי חייבת להיות בין 0 ל-100'),
    ('Contract not found or access denied', 'Contract not found or access denied', 'החוזה לא נמצא או שאין הרשאה'),
    ('Invalid contract_id', 'Invalid contract_id', 'מזהה חוזה לא תקין'),
    ('Invalid contract id or professional grade', 'Invalid contract id or professional grade', 'מזהה חוזה או דרגה מקצועית לא תקינים'),
    ('Contract user fee entry not found', 'Contract user fee entry not found', 'רשומת דמי חוזה משתמש לא נמצאה')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- Sidebar: User contract fee
WITH side AS (
  SELECT id FROM languages_screens WHERE screen_name = 'sidebar'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT side.id,
       'User contract fee',
       l.id,
       CASE WHEN l.direction = 0 THEN 'User contract fee' ELSE 'דמי חוזה משתמש' END
FROM langs l
CROSS JOIN side
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

