interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

interface AuthPayload {
  sub: string;
  email: string;
  exp: number;
}

type Json = Record<string, unknown>;

const encoder = new TextEncoder();

const json = (data: Json, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const unauthorized = () => json({ error: "Unauthorized" }, 401);
const forbidden = () => json({ error: "Forbidden" }, 403);
const badRequest = (msg: string) => json({ error: msg }, 400);

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const importHmacKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

const signToken = async (payload: AuthPayload, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const h = toBase64Url(encoder.encode(JSON.stringify(header)));
  const p = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const input = `${h}.${p}`;
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return `${input}.${toBase64Url(new Uint8Array(sig))}`;
};

const verifyToken = async (token: string, secret: string): Promise<AuthPayload | null> => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(s), encoder.encode(`${h}.${p}`));
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(p))) as AuthPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2$${iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(hash))}`;
};

const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
  const [kind, iterString, saltB64, hashB64] = encoded.split("$");
  if (kind !== "pbkdf2" || !iterString || !saltB64 || !hashB64) return false;
  const iterations = Number(iterString);
  if (!Number.isFinite(iterations)) return false;
  const salt = fromBase64Url(saltB64);
  const expected = fromBase64Url(hashB64);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  const actualBytes = new Uint8Array(actual);
  if (actualBytes.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actualBytes.length; i++) diff |= actualBytes[i] ^ expected[i];
  return diff === 0;
};

const parseJson = async (request: Request): Promise<Json | null> => {
  try {
    return (await request.json()) as Json;
  } catch {
    return null;
  }
};

const getAuthPayload = async (request: Request, env: Env) => {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return verifyToken(token, env.AUTH_SECRET);
};

const getProfile = async (env: Env, id: string) => {
  const result = await env.DB.prepare(
    "SELECT id, email, full_name, is_admin, created_at FROM profiles WHERE id = ? LIMIT 1"
  )
    .bind(id)
    .first<{
      id: string;
      email: string;
      full_name: string | null;
      is_admin: number;
      created_at: string;
    }>();
  if (!result) return null;
  return {
    id: result.id,
    email: result.email,
    full_name: result.full_name,
    is_admin: Boolean(result.is_admin),
    created_at: result.created_at,
  };
};

const requireUser = async (request: Request, env: Env) => {
  const payload = await getAuthPayload(request, env);
  if (!payload) return null;
  const profile = await getProfile(env, payload.sub);
  if (!profile) return null;
  return { payload, profile };
};

const requireAdmin = async (request: Request, env: Env) => {
  const auth = await requireUser(request, env);
  if (!auth || !auth.profile.is_admin) return null;
  return auth;
};

const ensureReviewsTable = async (env: Env) => {
  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        customer_name TEXT,
        customer_email TEXT,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title TEXT,
        comment TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        admin_note TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
      )
    `),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at)"),
  ]);
};

const getPath = (request: Request) => {
  const path = new URL(request.url).pathname;
  return path.replace(/^\/api\/?/, "");
};

const allowedOrderStatuses = new Set(["pending", "processing", "shipped", "delivered", "cancelled"]);
const allowedCustomStatuses = new Set(["pending", "in_progress", "completed", "cancelled"]);
const allowedReviewStatuses = new Set(["pending", "approved", "rejected"]);

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const method = request.method.toUpperCase();
  const path = getPath(request);
  const segments = path.split("/").filter(Boolean);

  try {
    if (!env.DB) {
      return json({ error: "Server misconfigured: missing D1 binding `DB`." }, 500);
    }
    if (!env.AUTH_SECRET) {
      return json({ error: "Server misconfigured: missing secret `AUTH_SECRET`." }, 500);
    }

    if (method === "POST" && path === "auth/signup") {
      const body = await parseJson(request);
      if (!body) return badRequest("Invalid JSON body");
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const fullName = String(body.fullName || "").trim();
      if (!email || !password) return badRequest("Email and password are required");
      if (password.length < 6) return badRequest("Password must be at least 6 characters");

      const existing = await env.DB.prepare("SELECT id FROM profiles WHERE email = ? LIMIT 1")
        .bind(email)
        .first<{ id: string }>();
      if (existing) return json({ error: "Email already in use" }, 409);

      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(password);
      await env.DB.prepare(
        "INSERT INTO profiles (id, email, full_name, password_hash, is_admin) VALUES (?, ?, ?, ?, 0)"
      )
        .bind(id, email, fullName || null, passwordHash)
        .run();

      const profile = await getProfile(env, id);
      const token = await signToken(
        {
          sub: id,
          email,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        },
        env.AUTH_SECRET
      );
      return json({ token, user: { id, email }, profile: profile as Json });
    }

    if (method === "POST" && path === "auth/login") {
      const body = await parseJson(request);
      if (!body) return badRequest("Invalid JSON body");
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return badRequest("Email and password are required");

      const record = await env.DB.prepare(
        "SELECT id, email, password_hash FROM profiles WHERE email = ? LIMIT 1"
      )
        .bind(email)
        .first<{ id: string; email: string; password_hash: string | null }>();
      if (!record || !record.password_hash) return unauthorized();
      const ok = await verifyPassword(password, record.password_hash);
      if (!ok) return unauthorized();

      const token = await signToken(
        {
          sub: record.id,
          email: record.email,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        },
        env.AUTH_SECRET
      );
      const profile = await getProfile(env, record.id);
      return json({ token, user: { id: record.id, email: record.email }, profile: profile as Json });
    }

    if (method === "GET" && path === "auth/me") {
      const auth = await requireUser(request, env);
      if (!auth) return unauthorized();
      return json({
        user: { id: auth.profile.id, email: auth.profile.email },
        profile: auth.profile as Json,
      });
    }

    if (method === "GET" && path === "candles") {
      const result = await env.DB.prepare(
        "SELECT * FROM candles WHERE is_active = 1 ORDER BY datetime(created_at) DESC"
      ).all();
      return json({ data: result.results as Json[] });
    }

    if (segments[0] === "candles" && segments[1] === "admin") {
      const admin = await requireAdmin(request, env);
      if (!admin) return forbidden();

      if (method === "GET" && segments.length === 2) {
        const result = await env.DB.prepare("SELECT * FROM candles ORDER BY datetime(created_at) DESC").all();
        return json({ data: result.results as Json[] });
      }

      if (method === "POST" && segments.length === 2) {
        const body = await parseJson(request);
        if (!body) return badRequest("Invalid JSON body");
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO candles (
            id, name, description, price, stock_quantity, scent, size, burn_time, image_url, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            body.name,
            body.description ?? null,
            Number(body.price),
            Number(body.stock_quantity ?? 0),
            body.scent ?? null,
            body.size ?? null,
            body.burn_time ? Number(body.burn_time) : null,
            body.image_url ?? null,
            body.is_active ? 1 : 0
          )
          .run();
        return json({ id }, 201);
      }

      if (segments.length === 3) {
        const candleId = segments[2];
        if (method === "PUT") {
          const body = await parseJson(request);
          if (!body) return badRequest("Invalid JSON body");
          await env.DB.prepare(
            `UPDATE candles
             SET name = ?, description = ?, price = ?, stock_quantity = ?, scent = ?, size = ?, burn_time = ?, image_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`
          )
            .bind(
              body.name,
              body.description ?? null,
              Number(body.price),
              Number(body.stock_quantity ?? 0),
              body.scent ?? null,
              body.size ?? null,
              body.burn_time ? Number(body.burn_time) : null,
              body.image_url ?? null,
              body.is_active ? 1 : 0,
              candleId
            )
            .run();
          return json({ ok: true });
        }
        if (method === "DELETE") {
          await env.DB.prepare("DELETE FROM candles WHERE id = ?").bind(candleId).run();
          return json({ ok: true });
        }
      }
    }

    if (method === "POST" && path === "orders") {
      const auth = await requireUser(request, env);
      if (!auth) return unauthorized();
      const body = await parseJson(request);
      if (!body) return badRequest("Invalid JSON body");

      const items = (body.items as Array<{ candle_id: string; quantity: number }>) || [];
      if (!items.length) return badRequest("Order items are required");

      const uniqueIds = [...new Set(items.map((i) => i.candle_id))];
      const placeholders = uniqueIds.map(() => "?").join(", ");
      const candles = await env.DB.prepare(
        `SELECT id, name, price, stock_quantity FROM candles WHERE is_active = 1 AND id IN (${placeholders})`
      )
        .bind(...uniqueIds)
        .all<{ id: string; name: string; price: number; stock_quantity: number }>();

      const candleMap = new Map(candles.results.map((c) => [c.id, c]));
      let total = 0;
      for (const item of items) {
        const row = candleMap.get(item.candle_id);
        const qty = Number(item.quantity);
        if (!row || !Number.isInteger(qty) || qty <= 0) return badRequest("Invalid order items");
        if (row.stock_quantity < qty) return badRequest(`Insufficient stock for ${row.name}`);
        total += row.price * qty;
      }

      const orderId = crypto.randomUUID();
      const statements: D1PreparedStatement[] = [];
      statements.push(
        env.DB.prepare(
          `INSERT INTO orders (
            id, user_id, status, total_amount, shipping_address, customer_name, customer_email, customer_phone
          ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`
        ).bind(
          orderId,
          auth.profile.id,
          total,
          String(body.shipping_address || ""),
          String(body.customer_name || ""),
          String(body.customer_email || ""),
          body.customer_phone ? String(body.customer_phone) : null
        )
      );

      for (const item of items) {
        const candle = candleMap.get(item.candle_id)!;
        const qty = Number(item.quantity);
        statements.push(
          env.DB.prepare(
            "INSERT INTO order_items (id, order_id, candle_id, quantity, price_at_time, candle_name) VALUES (?, ?, ?, ?, ?, ?)"
          ).bind(crypto.randomUUID(), orderId, candle.id, qty, candle.price, candle.name)
        );
        statements.push(
          env.DB.prepare(
            "UPDATE candles SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(qty, candle.id)
        );
      }

      await env.DB.batch(statements);
      return json({ id: orderId, total_amount: total }, 201);
    }

    if (segments[0] === "orders" && segments[1] === "admin") {
      const admin = await requireAdmin(request, env);
      if (!admin) return forbidden();

      if (method === "GET" && segments.length === 2) {
        const result = await env.DB.prepare("SELECT * FROM orders ORDER BY datetime(created_at) DESC").all();
        return json({ data: result.results as Json[] });
      }

      if (method === "GET" && segments.length === 4 && segments[3] === "items") {
        const result = await env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?")
          .bind(segments[2])
          .all();
        return json({ data: result.results as Json[] });
      }

      if (method === "PUT" && segments.length === 4 && segments[3] === "status") {
        const body = await parseJson(request);
        if (!body) return badRequest("Invalid JSON body");
        const status = String(body.status || "");
        if (!allowedOrderStatuses.has(status)) return badRequest("Invalid status");
        await env.DB.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(status, segments[2])
          .run();
        return json({ ok: true });
      }
    }

    if (method === "POST" && path === "custom-orders") {
      const auth = await requireUser(request, env);
      if (!auth) return unauthorized();
      const body = await parseJson(request);
      if (!body) return badRequest("Invalid JSON body");
      await env.DB.prepare(
        `INSERT INTO custom_candle_orders (
          id, user_id, customer_name, customer_email, customer_phone, scent_preference, size, color_preference, container_type, special_instructions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
        .bind(
          crypto.randomUUID(),
          auth.profile.id,
          body.customer_name,
          body.customer_email,
          body.customer_phone ?? null,
          body.scent_preference ?? null,
          body.size ?? null,
          body.color_preference ?? null,
          body.container_type ?? null,
          body.special_instructions ?? null
        )
        .run();
      return json({ ok: true }, 201);
    }

    if (segments[0] === "custom-orders" && segments[1] === "admin") {
      const admin = await requireAdmin(request, env);
      if (!admin) return forbidden();

      if (method === "GET" && segments.length === 2) {
        const result = await env.DB.prepare(
          "SELECT * FROM custom_candle_orders ORDER BY datetime(created_at) DESC"
        ).all();
        return json({ data: result.results as Json[] });
      }

      if (method === "PUT" && segments.length === 4 && segments[3] === "status") {
        const body = await parseJson(request);
        if (!body) return badRequest("Invalid JSON body");
        const status = String(body.status || "");
        if (!allowedCustomStatuses.has(status)) return badRequest("Invalid status");
        await env.DB.prepare(
          "UPDATE custom_candle_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
          .bind(status, segments[2])
          .run();
        return json({ ok: true });
      }

      if (method === "PUT" && segments.length === 4 && segments[3] === "price") {
        const body = await parseJson(request);
        if (!body) return badRequest("Invalid JSON body");
        const price = Number(body.estimated_price);
        if (!Number.isFinite(price) || price < 0) return badRequest("Invalid estimated price");
        await env.DB.prepare(
          "UPDATE custom_candle_orders SET estimated_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
          .bind(price, segments[2])
          .run();
        return json({ ok: true });
      }
    }

    if (method === "GET" && path === "reviews") {
      await ensureReviewsTable(env);
      const result = await env.DB.prepare(
        `SELECT id, customer_name, rating, title, comment, created_at, reviewed_at
         FROM reviews
         WHERE status = 'approved'
         ORDER BY datetime(COALESCE(reviewed_at, created_at)) DESC`
      ).all();
      return json({ data: result.results as Json[] });
    }

    if (method === "POST" && path === "reviews") {
      await ensureReviewsTable(env);
      const auth = await requireUser(request, env);
      if (!auth) return unauthorized();
      const body = await parseJson(request);
      if (!body) return badRequest("Invalid JSON body");

      const rating = Number(body.rating);
      const title = String(body.title || "").trim();
      const comment = String(body.comment || "").trim();
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return badRequest("Rating must be an integer between 1 and 5");
      }
      if (!comment) return badRequest("Review comment is required");

      await env.DB.prepare(
        `INSERT INTO reviews (
          id, user_id, customer_name, customer_email, rating, title, comment, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
        .bind(
          crypto.randomUUID(),
          auth.profile.id,
          auth.profile.full_name ?? null,
          auth.profile.email,
          rating,
          title || null,
          comment
        )
        .run();

      return json({ ok: true, message: "Review submitted for admin approval." }, 201);
    }

    if (segments[0] === "reviews" && segments[1] === "admin") {
      await ensureReviewsTable(env);
      const admin = await requireAdmin(request, env);
      if (!admin) return forbidden();

      if (method === "GET" && segments.length === 2) {
        const result = await env.DB.prepare(
          `SELECT id, user_id, customer_name, customer_email, rating, title, comment, status, admin_note, reviewed_by, reviewed_at, created_at, updated_at
           FROM reviews
           ORDER BY datetime(created_at) DESC`
        ).all();
        return json({ data: result.results as Json[] });
      }

      if (method === "PUT" && segments.length === 4 && segments[3] === "status") {
        const body = await parseJson(request);
        if (!body) return badRequest("Invalid JSON body");
        const status = String(body.status || "");
        const adminNote = body.admin_note ? String(body.admin_note) : null;
        if (!allowedReviewStatuses.has(status)) return badRequest("Invalid status");

        const existing = await env.DB.prepare("SELECT id FROM reviews WHERE id = ? LIMIT 1")
          .bind(segments[2])
          .first<{ id: string }>();
        if (!existing) return json({ error: "Review not found" }, 404);

        if (status === "pending") {
          await env.DB.prepare(
            "UPDATE reviews SET status = ?, admin_note = ?, reviewed_by = NULL, reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          )
            .bind(status, adminNote, segments[2])
            .run();
        } else {
          await env.DB.prepare(
            "UPDATE reviews SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          )
            .bind(status, adminNote, admin.profile.id, segments[2])
            .run();
        }

        return json({ ok: true });
      }

      if (method === "DELETE" && segments.length === 3) {
        const existing = await env.DB.prepare("SELECT id FROM reviews WHERE id = ? LIMIT 1")
          .bind(segments[2])
          .first<{ id: string }>();
        if (!existing) return json({ error: "Review not found" }, 404);

        await env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(segments[2]).run();
        return json({ ok: true });
      }
    }


    if (segments[0] === "users" && segments[1] === "admin") {
      const admin = await requireAdmin(request, env);
      if (!admin) return forbidden();

      if (method === "GET" && segments.length === 2) {
        const result = await env.DB.prepare(
          "SELECT id, email, full_name, is_admin, created_at FROM profiles ORDER BY datetime(created_at) DESC"
        ).all();
        return json({ data: result.results as Json[] });
      }

      if (method === "PUT" && segments.length === 3) {
        const body = await parseJson(request);
        if (!body) return badRequest("Invalid JSON body");

        const targetUserId = segments[2];
        const rawIsAdmin = body.is_admin;
        if (typeof rawIsAdmin !== "boolean") {
          return badRequest("`is_admin` must be a boolean");
        }

        if (targetUserId === admin.profile.id && rawIsAdmin === false) {
          return badRequest("You cannot remove your own admin access");
        }

        const existing = await env.DB.prepare("SELECT id FROM profiles WHERE id = ? LIMIT 1")
          .bind(targetUserId)
          .first<{ id: string }>();
        if (!existing) return json({ error: "User not found" }, 404);

        await env.DB.prepare("UPDATE profiles SET is_admin = ? WHERE id = ?")
          .bind(rawIsAdmin ? 1 : 0, targetUserId)
          .run();

        return json({ ok: true });
      }
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("API error:", error);
    return json(
      {
        error: "Internal server error",
        detail: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
};

