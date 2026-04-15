# BaaS (Timese) – Application Architecture

> **Purpose:** Single source of truth for architecture, tech stack, data model, and flows.  
> **Audience:** New team members and contributors.  
> **Maintenance:** Update this document at the end of every significant change (see [Cursor rule](#cursor-rule) below).

---

## 1. Application Overview

**Name:** BaaS (Timese – Bill Management for SMBs)  
**Type:** Full-stack web application for managing service offices, customers, projects, contracts, and related entities.  
**Stack:** Next.js (App Router), React, TypeScript, PostgreSQL, NextAuth.

The app is multi-tenant at the **account** level: each logged-in user (Google OAuth) owns one or more **accounts**. Each account has **service offices**, and each service office has **customers**, **projects**, **contracts**, **subcontractors**, and **service office users**. Data access is enforced so users only see data for accounts they own (via `accounts.user_id`).

---

## 2. Technologies Used

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| **Runtime** | Node.js | Via Next.js |
| **Framework** | Next.js | 16.1.1 (App Router) |
| **UI** | React | 19.2.3 |
| **Language** | TypeScript | 5.9.x |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | Radix UI, Shadcn-style patterns | @radix-ui/react-slot, cva |
| **Auth** | NextAuth.js | 4.24.x (Google OAuth, JWT session) |
| **Database** | PostgreSQL | Via `pg` 8.18.x |
| **Email** | Nodemailer, Resend | Optional (verification, etc.) |
| **AI / Playground** | LangChain, OpenAI | @langchain/*, optional |
| **Fonts** | Geist, Geist Mono | next/font |

- **Proxy (request boundary):** Next.js 16 uses `proxy.ts` (not `middleware.ts`) for the network boundary in front of the app.
- **Database config:** Loaded from `database/db-config.json` (PostgreSQL connection; not committed; see `.env.local` for secrets).
- **App feature settings:** `config/app-feature-settings.json` (committed). `EnableEmailVerification` (default `true`) controls whether `POST /api/account/verify-email/send` actually sends email via SMTP/Resend; when `false`, the verification code is still stored but no email is sent. The UI reads the same flag via `GET /api/app-feature-settings` and skips the verification modal and proceeds with save/create when it is `false`.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                               │
│  React 19, Next.js App Router, Tailwind, RSC + Client Components         │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Next.js (Next.js 16)                                 │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────────────────┐  │
│  │ proxy.ts      │   │ App Router    │   │ API Routes                 │  │
│  │ (auth gate    │──▶│ (pages,       │──▶│ /api/* (REST, auth +       │  │
│  │  for routes) │   │  layout, RSC) │   │  account-scoped access)    │  │
│  └───────────────┘   └───────────────┘   └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Auth: NextAuth (Google OAuth, JWT)  │  Data: getDbClient() → PostgreSQL │
└─────────────────────────────────────────────────────────────────────────┘
```

- **proxy.ts:** Runs before page rendering; checks session (cookie/JWT); redirects unauthenticated users to `/` for protected paths.
- **App Router:** Serves pages and layout; uses server components by default; wraps app in Auth, Theme, Language, Translation providers.
- **API routes:** All under `app/api/`. Authenticate via `getAuthenticatedUser()` and enforce access by joining through `accounts` → `user_id`.

---

## 4. System Flow

### 4.1 Authentication Flow

1. User visits the app → **proxy** runs.
2. If path is protected and no valid session → redirect to `/` with message.
3. If path is public (e.g. `/`) → landing page; user can sign in with Google.
4. NextAuth (`/api/auth/[...nextauth]`) handles OAuth; on success, user is upserted into `users` (PostgreSQL).
5. Session is JWT-based; `getServerSession(authOptions)` / `getAuthenticatedUser()` resolve the current user by email from `users`.

### 4.2 Data Access Flow (API)

1. Client or server calls an API route (e.g. `GET /api/customers?service_office_id=5`).
2. Route calls `getAuthenticatedUser()` → 401 if not signed in.
3. Route uses `getDbClient()`, runs a query that joins through `accounts` so that only data belonging to the current user’s accounts is returned (e.g. `INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1`).
4. Response is JSON; client updates UI.

### 4.3 Service Office User Data Authorization

- **Service office users** are per–service office (employees/subcontractors), not the same as app users (Google accounts).
- **service_office_users_data_authorization** table controls which **customers**, **projects**, and **contracts** a service office user can access.
- **Entity types:** `2` = customer, `3` = project, `4` = contract, `100` = all future customers (entity_id = service_office_id), `101` = all future projects for a customer (entity_id = customer_id).
- Assignments are managed in the **Assign Customers & Projects** wizard (modal) and persisted via `POST/GET /api/user-data-authorization`.

---

## 5. Frontend

### 5.1 Structure

- **App Router:** `app/` – `layout.tsx`, `page.tsx`, and route segments under `app/`.
- **Pages (main screens):**  
  `accounts`, `service-offices`, `customers`, `subcontractors`, `service-office-users`, `projects`, `contracts`,  
  `subscriptions-offers`, `system-lookups`, `languages`, `language-labels`, `screens`, `dashboards`, `playground`, `use-cases`, `billing`, `settings`, `protected`.
- **Auth:** `app/auth/auth-error`, sign-in via NextAuth on `/`.
- **Layout:** Root layout wraps with `AuthProvider`, `ThemeProvider`, `LanguageProvider`, `TranslationProvider`, `AutoTranslate`. Authenticated areas use a layout that includes the **sidebar** (navigation).

### 5.2 Key Components

| Location | Purpose |
|----------|--------|
| `app/components/sidebar.tsx` | Main nav sidebar; uses Session, language, translations; ThemeSelector; mobile toggle. |
| `app/components/ThemeSelector.tsx` | Theme toggle (currently hidden for UX). |
| `app/components/AutoTranslate.tsx` | Walks `document.body` text nodes and applies `languages_screens_translations` via `translateExact`. Skips subtrees marked `data-no-auto-translate` (e.g. dynamic numeric columns like subscription-offer prices) so React updates are not overwritten by a stale cached “original” string. |
| `app/components/notifications.tsx` | In-app notifications. |
| `components/header.tsx`, `components/hero.tsx`, etc. | Landing page sections. |

### 5.3 Contexts

- **AuthProvider** (`app/context/AuthContext.tsx`): Wraps with NextAuth `SessionProvider`; session can be pre-fetched server-side.
- **ThemeProvider** (`app/context/ThemeContext.tsx`): Theme state (e.g. light/dark).
- **LanguageProvider** (`app/context/LanguageContext.tsx`): Current UI language.
- **TranslationProvider** (`app/context/TranslationContext.tsx`): Translation strings for UI.

### 5.4 Database / Feature Components (Modals & Wizards)

Reusable modals and wizards live under `database/` and are used by app pages:

- **Accounts:** `AccountModal`, `AccountWizardModal` (Service Office step: subscription-offer options are **all rows** from system lookup table **8** for the current UI language, merged with **active** `subscriptions_offers` by `subscription_offer_type`; each selectable option submits `subscription_offer_id`), `EmailVerificationModal`
- **Service offices:** `ServiceOfficeModal`, `AccountServiceOfficesModal`; modal includes subscription-offer dropdown from active `subscriptions_offers` rows. On create it is required and creates initial `subscriptions` row. On edit, changing offer closes current active `subscriptions` row (`status=2`, end/update timestamps) and inserts a new active row.
- **Customers:** `CustomerModal`, `ServiceOfficeCustomersModal`
- **Projects:** `ProjectModal`, `CustomerProjectsModal`, `AssignContractsModal`
- **Contracts:** `ContractModal`; the contracts grid (`app/contracts/page.tsx`) shows **contract type** as a translated label from the Contract Type system lookup (not the raw stored id). **Hourly create:** the modal closes after the first successful save (no second save to obtain `contract_id` for a separate fee button). Active + hourly still requires at least one `contract_user_fee` row when **updating** an existing contract (`PATCH /api/contracts/[id]`). Hourly (contract type 2) user-fee configuration uses `ContractHourlyFeeModal` (`database/contract_user_fee/ContractHourlyFeeModal.tsx`) from the contract wizard (Configure user fee) and from the contracts grid; milestone configuration for contract types 0/1 uses `ContractMilestonesModal` + `ContractMilestoneModal` (`database/contract_milestones_data/`) with row drag-and-drop reorder (`POST /api/contract-milestones/reorder`). Contract type 4 (“success”) adds `ContractSuccessMilestonesModal` + `ContractSuccessMilestoneModal` (`database/contract_milestones_data_for_success/`) with its own CRUD/reorder APIs and type-dependent field validation (Fixed vs Percentage). Milestone add/edit for regular milestones enforces total amount vs `contract_amount_value` and total percentage ≤ 100% (`app/lib/contract-milestones-aggregate-validation.ts`).  
- **Subcontractors:** `SubcontractorModal`, `ServiceOfficeSubcontractorsModal`
- **Service office users:** `ServiceOfficeUserModal`, `ServiceOfficeUsersModal`, `AssignCustomersProjectsWizard`
- **System lookups:** `SystemLookupModal`, `LookupValuesModal`
- **Screens:** `ScreenModal`, `ScreenTranslationsModal`, `ScreenPermissionsModal`
- **Languages:** `LanguageModal`
- **Subscriptions offers:** `SubscriptionOfferModal` (`database/subscriptions_offers/SubscriptionOfferModal.tsx`); grid and CRUD on `app/subscriptions-offers/page.tsx`. Offer **type** uses `system_lookup_values` for `lookup_table_id = 8` (with `language_id` for labels). On save, `subscription_offer_name` is set to the **translated** `value_name` for the selected type. **Monthly price and currency** are stored in **`subscription_offer_prices`** (current row = `price_end_datetime IS NULL`); changing price/currency closes the previous row (`price_end_datetime` set) and inserts a new open row. **Currency** options match contracts (`database/contracts/currencies.ts`). If **type** `value_id` is **0**, monthly price is forced to **0** and the price field is disabled (`SUBSCRIPTION_OFFER_TYPE_ZERO_PRICE`). **At most one Active offer per `subscription_offer_type`** on `subscriptions_offers` (partial unique where `status = 1`). API error text matches `database/subscriptions_offers/active-type-conflict-message.ts` for `t()` translation. `updated_datetime` is NULL until the first UPDATE (trigger sets it on update only).

Conventions: functional components, TypeScript interfaces, named exports; modals receive `isOpen`, `onClose`, and entity-specific props.

---

## 6. Backend (API)

### 6.1 API Route Pattern

- **Auth:** Each route that needs it calls `getAuthenticatedUser()` from `app/lib/auth.ts`; returns 401 if not logged in.
- **Access control:** Queries filter by `user_id` via `accounts` (e.g. join `service_offices` → `accounts` → `accounts.user_id = $1`).
- **DB:** `getDbClient()` from `database/accounts/db-client.ts` (reads `database/db-config.json`). Each route typically `connect()` → query → `end()` in a try/finally.
- **Milestone totals:** `app/lib/contract-milestones-aggregate-validation.ts` — shared rules for sum of milestone amounts vs contract amount and sum of percentages ≤ 100; used by milestone POST/PATCH routes and the add/edit milestone modal.

### 6.2 Main API Endpoints

| Area | Methods | Route(s) | Notes |
|------|---------|----------|--------|
| Auth | GET, POST | `/api/auth/[...nextauth]` | NextAuth handler. |
| Accounts | GET, POST | `/api/accounts` | GET/POST; GET by user. |
| Accounts | GET, PATCH, DELETE | `/api/accounts/[id]` | Single account. |
| Service offices | GET, POST | `/api/service-offices` | Filter by account. **POST** requires `subscription_offer_id`; creates service office + initial `subscriptions` row (`status=1`, `subscription_start_datetime=CURRENT_TIMESTAMP`) in one transaction. |
| Service offices | GET, PATCH, DELETE | `/api/service-offices/[id]` | **PATCH** supports `subscription_offer_id`; when changed, inactivates current active subscription (status=2, sets `subscription_end_datetime` and `updated_datetime` to now) and inserts a new active subscription row. |
| Customers | GET, POST | `/api/customers` | Optional `service_office_id`. |
| Customers | GET, PATCH, DELETE | `/api/customers/[id]` | |
| Projects | GET, POST | `/api/projects` | By service_office_id, customer_id. |
| Projects | GET, PATCH, DELETE | `/api/projects/[id]` | |
| Contracts | GET, POST | `/api/contracts` | By service_office_id, customer_id. |
| Contracts | PATCH, DELETE | `/api/contracts/[id]` | |
| Contract milestones | GET, POST | `/api/contract-milestones` | Milestones per contract (`contract_id` required); list ordered by `milestone_sequential_number`. **POST** rejects when sum of milestone amounts would exceed `contracts.contract_amount_value` (if set) or sum of percentages would exceed 100%. |
| Contract milestones | POST | `/api/contract-milestones/reorder` | Body: `contract_id`, `ordered_sequential_numbers` (permutation of existing seq values). Remaps `milestone_sequential_number` to 1…n in that order (transaction + offset strategy to avoid PK clashes). Returns `{ milestones }`. |
| Contract milestones | PATCH, DELETE | `/api/contract-milestones/[contract_id]/[milestone_sequential_number]` | Single milestone updates (same aggregate rules as POST when amount/percentage change); **DELETE** also compacts remaining rows to sequential 1…n and returns `{ success, milestones }`. |
| Contract success milestones | GET, POST | `/api/contract-success-milestones` | By `contract_id`; milestone type rules: Fixed(0) requires amount, Percentage(1) requires percentage + reference figure + reference figure description. |
| Contract success milestones | POST | `/api/contract-success-milestones/reorder` | Same reorder semantics as regular milestones; returns `{ milestones }`. |
| Contract success milestones | PATCH, DELETE | `/api/contract-success-milestones/[contract_id]/[milestone_sequential_number]` | Update/delete single success milestone; delete compacts sequence to 1…n. |
| Subcontractors | GET, POST | `/api/subcontractors` | By service_office_id. |
| Subcontractors | GET, PATCH, DELETE | `/api/subcontractors/[id]` | |
| Service office users | GET, POST | `/api/service-office-users` | By service_office_id. |
| Service office users | GET, PATCH, DELETE | `/api/service-office-users/[id]` | |
| User data authorization | GET, POST | `/api/user-data-authorization` | Assign customers/projects/contracts to service office user. |
| Entity pairs | GET, POST | `/api/entities-pairs` | Project–contract links (e.g. type 0). |
| Subscriptions offers | GET, POST | `/api/subscriptions-offers` | Authenticated; list / create. JSON rows use `subscriptionOfferRowToJson` (e.g. `subscription_offer_monthly_price` as string). |
| Subscriptions offers | PATCH, DELETE | `/api/subscriptions-offers/[id]` | Update / delete; PATCH/POST return the same JSON shape as the list. |
| Languages | GET, POST | `/api/languages` | |
| Languages | PATCH, DELETE | `/api/languages/[id]` | |
| UI screens | GET, POST | `/api/ui-screens` | **GET:** optional query `language_id`; `localized_name` / `localized_description` from `ui_screen_translations` (matched by `language_name` like name), phrase fallbacks (`source_text` = name or description), else English columns. |
| UI screens | GET, PATCH, DELETE | `/api/ui-screens/[id]` | |
| UI screen translations | GET, POST | `/api/ui-screen-translations` | **GET:** resolves a row by `screen_id` and `languages.language_name` for the requested `language_id` (not only exact `language_id`). |
| UI screen user type permissions | GET, POST, DELETE | `/api/ui-screen-usertype-permissions` | |
| System lookups | GET, POST | `/api/system-lookups` | |
| System lookups | GET, PATCH, DELETE | `/api/system-lookups/[id]` | |
| System lookup values | GET, POST | `/api/system-lookup-values` | |
| System lookup values | PATCH, DELETE | `/api/system-lookup-values/[id]` | |
| Translations | GET, POST | `/api/translations` | |
| Translations | PATCH, DELETE | `/api/translations/[id]` | |
| App feature settings | GET | `/api/app-feature-settings` | Returns `EnableEmailVerification` (and future safe toggles) for client UX. |
| Account verify email | POST | `/api/account/verify-email/send`, `verify` | Send respects `config/app-feature-settings.json` → `EnableEmailVerification`. |
| Keys (API keys) | GET, POST | `/api/keys` | |
| Keys | GET, PATCH, DELETE | `/api/keys/[id]` | |
| Keys | POST | `/api/keys/validate` | |
| GitHub summarizer | GET, POST | `/api/github-summarizer` | Optional AI feature. |

---

## 7. Database

### 7.1 Connection

- **Config:** `database/db-config.json` (key: `postgresql`: host, port, database, username, password, ssl).
- **Client:** `getDbClient()` in `database/accounts/db-client.ts` returns a new `pg.Client` per use; no connection pool in this file.

### 7.2 Core Tables (Order Reflects Dependencies)

| Table | Purpose |
|-------|--------|
| **users** | App users (Google OAuth); `id` (UUID), `email`, `name`, `image`, `provider`, etc. |
| **accounts** | Tenant root; `account_id`, `user_id` (→ users), `account_name`, contact info, card fields, `status` (1=Active, 2=Inactive, 3=Deleted). |
| **service_offices** | `service_office_id`, `account_id`, name, description, country, `status`. |
| **customers** | `customer_id`, `service_office_id`, name, legal_id, contact, address, `status`. |
| **subcontractors** | `subcontractor_id`, `service_office_id`, name, contact, `status`. |
| **projects** | `project_id`, `service_office_id`, `customer_id`, name, scope, `status`. |
| **contracts** | `contract_id`, `service_office_id`, `customer_id`, name, type, status, dates, amount, currency, payment plan fields. |
| **contract_milestones_data** | Contract milestones keyed by (`contract_id`, `milestone_sequential_number`), with criteria, due date, amount, percentage (0..100), progress/condition indicators, and related dates/user IDs. Display/API order is by `milestone_sequential_number`. Reorder and post-delete compaction remap sequences to 1…n via `app/lib/contract-milestones-sequencing.ts` (temporary offset updates). |
| **contract_milestones_data_for_success** | “Success” milestones per contract: same PK pattern (`contract_id`, `milestone_sequential_number`) with enforced insert sequence 1..n per contract; `milestone_criteria` required; `milestone_type` 0=Fixed / 1=Percentage. Type rules: Fixed requires `milestone_amount` and keeps `milestone_percentage` NULL; Percentage requires `milestone_percentage` (0..100) and keeps `milestone_amount` NULL. `milestone_percentage_reference_figure` (numeric) **and** `milestone_percentage_reference_figure_description` (`VARCHAR(200)`) are required for Percentage (1), optional for Fixed (0). Optional `min_payment_amount` / `max_payment_amount`; progress/met fields aligned with `contract_milestones_data`. Scripts: recreate `database/contract_milestones_data_for_success/create-contract-milestones-data-for-success-table.sql`, alter existing DBs `database/contract_milestones_data_for_success/alter-milestone-type-amount-percentage-nullability.sql`. |
| **service_office_users** | `service_office_user_id`, `service_office_id`, `subcontractor_id`, user_name, user_type, professional_grade, contact, `status`, password (optional). |
| **service_office_users_data_authorization** | `auth_id`, `user_id` (→ service_office_user_id), `authorized_entity_type`, `entity_id`. Types: 2=customer, 3=project, 4=contract, 100=all future customers (entity_id=service_office_id), 101=all future projects per customer (entity_id=customer_id). |
| **entities_pairs** | `pair_id`, `entities_pair_type`, `parent_entity_id`, `child_entity_id`, `sort_order`. Used e.g. for project–contract links (type 0). |
| **languages** | `id`, `language_name`, `direction` (0=LTR, 1=RTL). |
| **ui_screens** | `screen_id`, `screen_name`, `screen_description`. |
| **ui_screen_translations** | Per-screen, per-language name/description (`ScreenTranslationsModal` + `/api/ui-screen-translations`). |
| **ui_screen_usertype_permissions** | Screen–user-type permissions. |
| **system_lookups** | `lookup_table_id`, `lookup_table_name`, description. |
| **system_lookup_values** | Lookup rows (table reference by name or FK depending on migration). |
| **system_lookup_translations** / **system_lookup_value_translations** | Localized labels. |
| **api_keys** | API keys (if used). |
| **email_verification** | Email verification codes (e.g. for account flows). |
| **subscriptions_offers** | `subscription_offer_id`, `administrator_restricted_offer` (0/1), `subscription_offer_name` (100 chars), `subscription_offer_type` (`value_id` for lookup **8**), `status` (1=Active, 2=Inactive, 3=Deleted), `creation_datetime`, `updated_datetime` (NULL until first UPDATE; trigger). **No** monthly price/currency on this table — they live in **`subscription_offer_prices`**. **Partial unique** on `subscription_offer_type` where `status = 1`. Scripts: `create-subscriptions-offers-table.sql`, `migrate-move-price-columns-to-subscription-offer-prices.sql` (legacy DBs that still had price columns), older migrates as before. |
| **subscription_offer_prices** | Price **history** per offer: `subscription_offer_price_id`, `subscription_offer_id` (FK CASCADE), `subscription_offer_monthly_price`, `offer_currency` (ISO 4217 uppercase), `price_start_datetime`, `price_end_datetime` (NULL = current/open row). **At most one open row per offer** (`uq_subscription_offer_prices_one_open` where `price_end_datetime IS NULL`). API `POST/PATCH /api/subscriptions-offers` closes the previous open row and inserts a new one when price or currency changes. Scripts: `database/subscription_offer_prices/create-subscription-offer-prices-table.sql`; logic: `app/lib/subscription-offer-prices.ts`. |
| **subscriptions** | `subscription_id`, `service_office_id`, `subscription_offer_id`, `status` (1=Active, 2=Inactive, 3=Deleted), `subscription_start_datetime`, `subscription_end_datetime` (NULL default), `creation_datetime`, `updated_datetime` (NULL until first UPDATE). Scripts: `database/subscriptions/create-subscriptions-table.sql`, `database/subscriptions/migrate-backfill-subscriptions-from-type-0.sql` (backfill existing service offices with active type-0 offer when missing). |

Create scripts live under `database/<entity>/create-*.sql` and are run manually or via `database/run-sql.mjs`.

---

## 8. Security Measures

- **Authentication:** NextAuth with Google OAuth; JWT session; no password storage for app users. Session validated in proxy and in API via `getAuthenticatedUser()`.
- **Route protection:** `proxy.ts` redirects unauthenticated users to `/` for all protected paths (e.g. `/dashboards`, `/accounts`, `/customers`, …). API routes do not rely on proxy alone; they enforce auth themselves.
- **Authorization:** API routes that touch accounts/service offices/customers/projects/contracts join through `accounts` and filter by `user_id` (from session). No cross-account data leakage by design.
- **Service office user scope:** Data visibility for service office users is limited by `service_office_users_data_authorization` and applied where relevant (e.g. user-data-authorization API).
- **Secrets:** `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, DB credentials in `db-config.json` or env; not committed.
- **SQL:** Parameterized queries (`$1`, `$2`, …) throughout; no raw string interpolation of user input into SQL.

---

## 9. Repo Layout (Summary)

```
app/
  api/                    # API routes (see section 6)
  auth/                   # Auth error page
  components/             # Sidebar, ThemeSelector, AutoTranslate, notifications
  context/                # Auth, Theme, Language, Translation
  dashboards/, accounts/, service-offices/, customers/, subcontractors/,
  service-office-users/, projects/, contracts/, subscriptions_offers/, system-lookups/, languages/,
  language-labels/, screens/, playground/, use-cases/, billing/, settings/, protected/
  layout.tsx, page.tsx, globals.css
components/               # Landing: header, hero, features, etc.
config/                   # app-feature-settings.json (feature flags / app toggles)
database/
  accounts/               # db-client, types, create table, modals
  Service_Offices/        # create table, modals, types, countries
  customer/, project/, contracts/, contract_milestones_data/, contract_milestones_data_for_success/, subcontractors/, service_office_users/, subscriptions/
  service_office_user_data_authorization/, entities_pairs/
  system_lookups/, system_lookup_values/, screens/, Languages/, Languages_Screens/
  Translations/, api_keys/, email_verification/, subscriptions_offers/, subscription_offer_prices/, users/
  run-sql.mjs, verify-table.mjs, db-config.json
Documents/
  architecture.md         # This file
proxy.ts                  # Request boundary (auth redirect)
.cursorrules              # Project-wide coding conventions
```

---

## 10. Cursor Rule (Updating This Document)

A Cursor rule is configured so that **at the end of every significant change** (new features, new API routes, new tables, major refactors, new security measures, or structural changes), the agent must **update this document** (`Documents/architecture.md`) to reflect:

- New or removed routes, tables, or components.
- Changes in auth or authorization flow.
- New technologies or major version changes.
- Any section that becomes outdated.

Keep this file accurate and concise so new team members can onboard quickly.
