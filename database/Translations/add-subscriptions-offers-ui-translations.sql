-- UI translations for Subscriptions offers screen and sidebar
-- Run: node database/run-sql.mjs database/Translations/add-subscriptions-offers-ui-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('subscriptions-offers')
ON CONFLICT (screen_name) DO NOTHING;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'subscriptions-offers'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Subscriptions offers', 'Subscriptions offers', 'הצעות מנוי'),
    ('Manage subscription service offers and pricing', 'Manage subscription service offers and pricing', 'ניהול הצעות שירות מנוי ותמחור'),
    ('Subscription offers list', 'Subscription offers list', 'רשימת הצעות מנוי'),
    ('Add Service offer', 'Add Service offer', 'הוסף הצעת שירות'),
    ('Edit Service offer', 'Edit Service offer', 'עריכת הצעת שירות'),
    ('Update Service offer details', 'Update Service offer details', 'עדכון פרטי הצעת שירות'),
    ('Fill in details for the new Service offer', 'Fill in details for the new Service offer', 'מלא פרטים להצעת שירות חדשה'),
    ('Subscription offer name', 'Subscription offer name', 'שם הצעת מנוי'),
    ('Subscription offer type', 'Subscription offer type', 'סוג הצעת מנוי'),
    ('Select subscription offer type', 'Select subscription offer type', 'בחר סוג הצעת מנוי'),
    ('Saved offer name', 'Saved offer name', 'שם ההצעה שנשמר'),
    ('Subscription offer monthly price', 'Subscription offer monthly price', 'מחיר חודשי להצעת מנוי'),
    ('Offer currency', 'Offer currency', 'מטבע ההצעה'),
    ('Administrator restricted offer', 'Administrator restricted offer', 'הצעה מוגבלת למנהל'),
    ('Subscription offer created', 'Subscription offer created', 'הצעת המנוי נוצרה'),
    ('Subscription offer updated', 'Subscription offer updated', 'הצעת המנוי עודכנה'),
    ('Subscription offer deleted', 'Subscription offer deleted', 'הצעת המנוי נמחקה'),
    ('Loading subscription offers', 'Loading subscription offers', 'טוען הצעות מנוי'),
    ('No subscription offers yet', 'No subscription offers yet', 'אין עדיין הצעות מנוי'),
    ('Failed to fetch subscription offers', 'Failed to fetch subscription offers', 'טעינת הצעות המנוי נכשלה'),
    ('Subscription offer monthly price is required', 'Subscription offer monthly price is required', 'נדרש מחיר חודשי להצעת מנוי'),
    ('A subscription offer for this type already exists', 'A subscription offer for this type already exists', 'כבר קיימת הצעת מנוי לסוג זה'),
    ('Only one active subscription offer is allowed per offer type.', 'Only one active subscription offer is allowed per offer type.', 'מותרת רק הצעת מנוי פעילה אחת לכל סוג הצעה.'),
    ('Failed to create', 'Failed to create', 'היצירה נכשלה'),
    ('Failed to update', 'Failed to update', 'העדכון נכשל'),
    ('Failed to delete', 'Failed to delete', 'המחיקה נכשלה'),
    ('Invalid subscription offer type for lookup table 8', 'Invalid subscription offer type for lookup table 8', 'סוג הצעת מנוי לא תקין לטבלת בדיקה 8'),
    ('Subscription offer not found', 'Subscription offer not found', 'הצעת המנוי לא נמצאה'),
    ('administrator_restricted_offer must be 0 or 1', 'administrator_restricted_offer must be 0 or 1', 'הגבלת מנהל חייבת להיות 0 או 1'),
    ('subscription_offer_name is required', 'subscription_offer_name is required', 'נדרש שם הצעת מנוי'),
    ('subscription_offer_type is required', 'subscription_offer_type is required', 'נדרש סוג הצעת מנוי'),
    ('offer_currency must be a 3-character ISO code', 'offer_currency must be a 3-character ISO code', 'מטבע ההצעה חייב להיות קוד ISO באורך 3 תווים'),
    ('status must be 1, 2, or 3', 'status must be 1, 2, or 3', 'הסטטוס חייב להיות 1, 2 או 3'),
    ('No', 'No', 'לא'),
    ('Yes', 'Yes', 'כן'),
    ('Active', 'Active', 'פעיל'),
    ('Inactive', 'Inactive', 'לא פעיל'),
    ('Deleted', 'Deleted', 'נמחק'),
    ('Cancel', 'Cancel', 'ביטול'),
    ('Save', 'Save', 'שמור'),
    ('Update', 'Update', 'עדכן'),
    ('Edit', 'Edit', 'ערוך'),
    ('Delete', 'Delete', 'מחק'),
    ('Confirm', 'Confirm', 'אישור'),
    ('Actions', 'Actions', 'פעולות'),
    ('Status', 'Status', 'סטטוס'),
    ('Operation failed', 'Operation failed', 'הפעולה נכשלה')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

-- Sidebar label
WITH side AS (
  SELECT id FROM languages_screens WHERE screen_name = 'sidebar'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT side.id,
       'Subscriptions offers',
       l.id,
       CASE WHEN l.direction = 0 THEN 'Subscriptions offers' ELSE 'הצעות מנוי' END
FROM langs l
CROSS JOIN side
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
