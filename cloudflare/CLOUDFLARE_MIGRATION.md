# Candle Haven: Cloudflare Migration Notes

## 1) Current Website Analysis

The current app is a Vite + React frontend that talks directly to Supabase from the browser.

Data access is in:
- `src/lib/supabase.ts`
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
- Supabase currently provides both `Auth` and `RLS`.
- Cloudflare D1 does not provide Supabase-style auth/session APIs or Postgres RLS.
- For Cloudflare, auth + authorization must move into a backend layer (Cloudflare Workers).

## 2) D1 Schema

Cloudflare-ready schema file:
- `cloudflare/d1/001_init.sql`

This recreates your existing tables in SQLite-compatible SQL with:
- Foreign keys
- Status checks
- Stock/price/boolean checks
- Indexes
- `updated_at` triggers

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

## 5) Data Migration from Supabase

Recommended:
1. Export each Supabase table to CSV.
2. Import CSV into D1 table-by-table.
3. Preserve IDs as text UUID strings.

If importing with Wrangler SQL, insert rows with explicit `id` and ISO datetime text values.

## 6) Required Backend Change (Critical)

Current frontend cannot safely query D1 directly.

You need Worker API routes for:
- Public candles list
- Authenticated order creation + item creation + stock decrement in one transaction
- Custom order creation
- Admin-only inventory/order/custom-order management

Authorization checks previously handled by Supabase RLS must be implemented in Worker code.

## 7) Minimal Next Step

After D1 is created and schema applied, build a Cloudflare Worker API and replace Supabase calls in frontend with `/api/*` endpoints.
