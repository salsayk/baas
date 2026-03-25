-- Add service-office-users screen and modal translations (EN/HE)
-- Run: node database/run-sql.mjs database/Translations/add-service-office-users-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('service-office-users')
ON CONFLICT (screen_name) DO NOTHING;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'service-office-users'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Service Office Users', 'Service Office Users', 'משתמשי משרד שירות'),
    ('Add Service Office User', 'Add Service Office User', 'הוסף משתמש משרד שירות'),
    ('Edit Service Office User', 'Edit Service Office User', 'עריכת משתמש משרד שירות'),
    ('Fill in details for the new user', 'Fill in details for the new user', 'מלא פרטים למשתמש החדש'),
    ('Update user details', 'Update user details', 'עדכן פרטי משתמש'),
    ('Add User', 'Add User', 'הוסף משתמש'),
    ('Select service office', 'Select service office', 'בחר משרד שירות'),
    ('By service office', 'By service office', 'לפי משרד שירות'),
    ('Select a service office to view and manage users', 'Select a service office to view and manage users', 'בחר משרד שירות לצפייה וניהול משתמשים'),
    ('User Name', 'User Name', 'שם משתמש'),
    ('User Type', 'User Type', 'סוג משתמש'),
    ('User Professional Grade', 'User Professional Grade', 'דרגה מקצועית'),
    ('Service Office', 'Service Office', 'משרד שירות'),
    ('Subcontractor', 'Subcontractor', 'קבלן משנה'),
    ('Select user type', 'Select user type', 'בחר סוג משתמש'),
    ('Select grade', 'Select grade', 'בחר דרגה'),
    ('Mobile Phone', 'Mobile Phone', 'טלפון נייד'),
    ('Secondary Phone', 'Secondary Phone', 'טלפון משני'),
    ('Email Address', 'Email Address', 'כתובת אימייל'),
    ('Status', 'Status', 'סטטוס'),
    ('Update', 'Update', 'עדכן'),
    ('Create', 'Create', 'צור'),
    ('Cancel', 'Cancel', 'ביטול'),
    ('Assign Customers & Projects', 'Assign Customers & Projects', 'הקצה לקוחות ופרויקטים')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
