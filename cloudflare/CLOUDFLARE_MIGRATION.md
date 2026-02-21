# Candle Haven: Cloudflare Migration Notes

## 1) Current Website Analysis

The app is now a Vite + React frontend that talks to Cloudflare Pages Functions (`/api/*`).

Data access is in:
- Legacy Supabase client removed from frontend
- `src/contexts/AuthContext.tsx`
- `src/components/Shop.tsx`
- `src/components/CustomOrderForm.tsx`
- `src/components/AdminInventory.tsx`
- `src/components/AdminOrders.tsx`
- `src/components/AdminCustomOrders.tsx`

Core data model (already mirrored in D1 schema):
- `profiles`
- `candles`
- `orders`
- `order_items`
- `custom_candle_orders`

Important architecture note:
- Cloudflare D1 does not provide Supabase-style auth/session APIs or Postgres RLS.
- Auth + authorization are implemented in the Pages Functions API.

## 2) D1 Schema

Cloudflare-ready schema file:
- `cloudflare/d1/001_init.sql`

This recreates your existing tables in SQLite-compatible SQL with:
- Foreign keys
- Status checks
- Stock/price/boolean checks
- Indexes
- `updated_at` triggers
- `profiles.password_hash` for Cloudflare auth

## 3) Create D1 Database

Run:

```powershell
npx wrangler d1 create candle-haven-db
```

Copy the returned `database_id` and add/update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "candle-haven-db"
database_id = "<your_database_id>"
```

## 4) Apply Schema

Local:

```powershell
npx wrangler d1 execute candle-haven-db --local --file cloudflare/d1/001_init.sql
```

Remote (production):

```powershell
npx wrangler d1 execute candle-haven-db --remote --file cloudflare/d1/001_init.sql
```

If you already created the DB with an older schema, run:

```powershell
npx wrangler d1 execute candle-haven-db --remote --file cloudflare/d1/002_add_password_hash.sql
```

## 5) Data Migration from Supabase

Recommended:
1. Export each Supabase table to CSV.
2. Import CSV into D1 table-by-table.
3. Preserve IDs as text UUID strings.

If importing with Wrangler SQL, insert rows with explicit `id` and ISO datetime text values.

## 6) Backend Migration Status

Implemented in this repository:
- `functions/api/[[route]].ts` (Cloudflare Pages Functions API)
- Token auth endpoints (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`)
- D1-backed product/order/admin/custom-order endpoints
- Frontend switched from Supabase to `/api/*`

Authorization is now enforced in API handlers (user/admin checks).

## 7) Required Env Vars

Set in Cloudflare Pages project:
- `AUTH_SECRET` (long random string, 32+ chars)

Set D1 binding in project settings:
- Binding name: `DB`
- Database: `candle-haven-db`

## 8) Set First Admin

After signing up your first account, promote it:

```powershell
npx wrangler d1 execute candle-haven-db --remote --command "UPDATE profiles SET is_admin = 1 WHERE email = 'your@email.com';"
```

## 9) Minimal Next Step

After D1 is created and schema applied, deploy Pages from GitHub and verify signup/login + order flows.
