-- Add account-wizard and service-office-users screens with EN/HE translations
-- for tab names, screen labels, Next/Back buttons, and user form labels
-- Run: node database/run-sql.mjs database/Translations/add-account-wizard-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('account-wizard'), ('service-office-users')
ON CONFLICT (screen_name) DO NOTHING;

-- account-wizard: tab names, title, subtitle, Next, Back, Create Account, Cancel
WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'account-wizard'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Account', 'Account', 'חשבון'),
    ('Service Office', 'Service Office', 'משרד שירות'),
    ('User (Supervisor)', 'User (Supervisor)', 'משתמש (מפקח)'),
    ('New Account Wizard', 'New Account Wizard', 'אשף חשבון חדש'),
    ('Create an account with its first service office and supervisor user', 'Create an account with its first service office and supervisor user', 'צור חשבון עם משרד השירות הראשון ומשתמש המפקח'),
    ('Next', 'Next', 'הבא'),
    ('Back', 'Back', 'חזור'),
    ('Prev', 'Prev', 'הקודם'),
    ('Create Account', 'Create Account', 'צור חשבון'),
    ('Cancel', 'Cancel', 'ביטול')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- account-wizard: validation and flow messages
WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'account-wizard'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Please enter the account name.', 'Please enter the account name.', 'אנא הזן את שם החשבון.'),
    ('Please enter the mobile phone.', 'Please enter the mobile phone.', 'אנא הזן מספר טלפון נייד.'),
    ('Please enter the email address.', 'Please enter the email address.', 'אנא הזן כתובת אימייל.'),
    ('Please select the status.', 'Please select the status.', 'אנא בחר סטטוס.'),
    ('Please enter the service office name.', 'Please enter the service office name.', 'אנא הזן את שם משרד השירות.'),
    ('Please enter the user name.', 'Please enter the user name.', 'אנא הזן את שם המשתמש.'),
    ('Please select the user type.', 'Please select the user type.', 'אנא בחר סוג משתמש.'),
    ('Please select the user professional grade.', 'Please select the user professional grade.', 'אנא בחר דרגה מקצועית.'),
    ('Email address is required to verify account changes.', 'Email address is required to verify account changes.', 'נדרשת כתובת אימייל לאימות שינויים בחשבון.'),
    ('Failed to send verification code', 'Failed to send verification code', 'שליחת קוד האימות נכשלה'),
    ('Failed to create account', 'Failed to create account', 'יצירת החשבון נכשלה'),
    ('Failed to create service office', 'Failed to create service office', 'יצירת משרד השירות נכשלה'),
    ('Failed to create user', 'Failed to create user', 'יצירת המשתמש נכשלה'),
    ('Operation failed', 'Operation failed', 'הפעולה נכשלה'),
    ('Invalid or expired code', 'Invalid or expired code', 'קוד לא תקף או שפג תוקפו'),
    ('User (Administrator)', 'User (Administrator)', 'משתמש (מנהל מערכת)'),
    ('Create an account with its first service office and administrator user', 'Create an account with its first service office and administrator user', 'צור חשבון עם משרד השירות הראשון ומשתמש מנהל מערכת'),
    ('Account', 'Account', 'חשבון'),
    ('created with service office and administrator', 'created with service office and administrator', 'נוצר עם משרד שירות ומנהל מערכת')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- service-office-users: user form labels (User tab in wizard)
WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'service-office-users'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('User Name', 'User Name', 'שם משתמש'),
    ('User Type', 'User Type', 'סוג משתמש'),
    ('User Professional Grade', 'User Professional Grade', 'דרגה מקצועית'),
    ('Service Office', 'Service Office', 'משרד שירות'),
    ('Subcontractor', 'Subcontractor', 'קבלן משנה'),
    ('Select user type', 'Select user type', 'בחר סוג משתמש'),
    ('Select grade', 'Select grade', 'בחר דרגה'),
    ('Select service office', 'Select service office', 'בחר משרד שירות'),
    ('— Select subcontractor —', '— Select subcontractor —', '— בחר קבלן משנה —'),
    ('Service office supervisor', 'Service office supervisor', 'מפקח משרד שירות'),
    ('Add subcontractor', 'Add subcontractor', 'הוסף קבלן משנה'),
    ('No subcontractors yet. Click the + button to add one.', 'No subcontractors yet. Click the + button to add one.', 'אין עדיין קבלני משנה. לחץ על הכפתור + כדי להוסיף אחד.'),
    ('Edit Service Office User', 'Edit Service Office User', 'עריכת משתמש משרד שירות'),
    ('Add Service Office User', 'Add Service Office User', 'הוסף משתמש משרד שירות'),
    ('Update user details', 'Update user details', 'עדכן פרטי משתמש'),
    ('Fill in details for the new user', 'Fill in details for the new user', 'מלא פרטים למשתמש החדש'),
    ('Update', 'Update', 'עדכן'),
    ('Create', 'Create', 'צור'),
    ('Active', 'Active', 'פעיל'),
    ('Inactive', 'Inactive', 'לא פעיל'),
    ('Deleted', 'Deleted', 'נמחק')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- accounts: modal subtitle strings
WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'accounts'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Update the account details below', 'Update the account details below', 'עדכן את פרטי החשבון למטה'),
    ('Fill in the details to create a new account', 'Fill in the details to create a new account', 'מלא את הפרטים ליצירת חשבון חדש')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- service-offices: labels used in Service Office tab (Service Office Name, Description, etc.)
WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'service-offices'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Service Office Name', 'Service Office Name', 'שם משרד שירות'),
    ('Description', 'Description', 'תיאור'),
    ('Account', 'Account', 'חשבון'),
    ('— Select country —', '— Select country —', '— בחר מדינה —'),
    ('Select account', 'Select account', 'בחר חשבון'),
    ('Manage users', 'Manage users', 'ניהול משתמשים'),
    ('Account cannot be changed when editing.', 'Account cannot be changed when editing.', 'החשבון לא ניתן לשינוי בעריכה.'),
    ('Update the service office details', 'Update the service office details', 'עדכן את פרטי משרד השירות'),
    ('Fill in the details for the new service office', 'Fill in the details for the new service office', 'מלא את הפרטים למשרד שירות חדש')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
