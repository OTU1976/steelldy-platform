// supabase/functions/get-index-data/index.ts
//
// STEELLDY — gated data endpoint. Replaces direct anon-key reads of the index
// tables from the browser. The browser no longer holds any privilege beyond
// "free" by default; a real entitlement (Analyst/Professional/Institutional)
// only exists if this function independently verifies the caller's Clerk
// session and looks up their publicMetadata.tier via the Clerk Backend API.
//
// Deployed with verify_jwt=false because the Authorization header carries a
// CLERK session token, not a Supabase-issued JWT — Supabase's platform-level
// JWT gate would reject it (and reject anonymous calls) before this code runs.
// Auth is instead handled entirely below, and fails closed to "free" on any
// missing/invalid/unverifiable token, Clerk outage, or missing secret.
//
// Required secret (set via Supabase Dashboard -> Edge Functions -> Secrets,
// or `supabase secrets set CLERK_SECRET_KEY=sk_live_...`): CLERK_SECRET_KEY
// (the Clerk *secret* key, never the publishable key, never pasted in chat).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by the platform.
//
// Until CLERK_SECRET_KEY is set, every caller — including paying customers —
// resolves to "free". That is a functionality gap, not a security gap: it
// only ever under-grants, never over-grants.
//
// 2026-08-11: deployed to project dcedzahmrvdxylmoesds (STEELLDY_LIVE) and
// live-tested unauthenticated for all four scopes (home/dashboard/risk/
// history) via browser — all correctly resolve to tier "free" and restrict
// to CCQI+DYOI (T-1) with risk/history refused. Paid-tier path is untested
// pending CLERK_SECRET_KEY being set (see IT memo).

import { createClerkClient } from "npm:@clerk/backend@1";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? "";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const clerk = CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: CLERK_SECRET_KEY })
  : null;

// Mirrors TIER_RANK / hasAccess already defined client-side in src/App.jsx —
// keep these two definitions in sync if the pricing tiers ever change.
const TIER_RANK: Record<string, number> = {
  free: 0,
  analyst: 1,
  professional: 2,
  institutional: 3,
};

// table/column map — must match INDEX_TABLES / HOME_INDEX_TABLES in src/App.jsx
const TABLES: Record<string, { table: string; col: string }> = {
  CCQI: { table: "index_ccqi", col: "ccqi_value" },
  DYOI: { table: "index_dyoi", col: "dyoi_value" },
  RTAI: { table: "rtai_index", col: "value" },
  SSSI: { table: "sssi_index", col: "value" },
  XSQI: { table: "xsqi_index", col: "value" },
  ETACI: { table: "etaci_index", col: "value" },
  CAVI: { table: "cavi_index", col: "value" },
  XCDI: { table: "xcdi_index", col: "value" },
  PII: { table: "pii_index", col: "value" },
};

// Free tier, per the pricing page: "CCQI preview (T-1)" + "DYOI preview (T-1)" only.
const FREE_IDS = ["CCQI", "DYOI"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function resolveTier(req: Request): Promise<{ tier: string; userId: string | null }> {
  if (!clerk) return { tier: "free", userId: null };
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return { tier: "free", userId: null };
  try {
    const state = await clerk.authenticateRequest(req, { acceptsToken: "session_token" });
    const auth = state.toAuth();
    if (!auth || !auth.userId) return { tier: "free", userId: null };
    const user = await clerk.users.getUser(auth.userId);
    const claimed = String(user.publicMetadata?.tier || "free").toLowerCase();
    const tier = TIER_RANK[claimed] != null ? claimed : "free";
    return { tier, userId: auth.userId };
  } catch (_e) {
    // Any verification failure (expired token, Clerk outage, malformed header,
    // wrong secret) fails closed to "free" — never throws, never over-grants.
    return { tier: "free", userId: null };
  }
}

async function latestRow(table: string) {
  const { data } = await sb.from(table).select("*").order("timestamp", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

async function t1Row(table: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await sb
    .from(table)
    .select("*")
    .lte("timestamp", since)
    .order("timestamp", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "dashboard"; // home | dashboard | risk | history
  const { tier } = await resolveTier(req);
  const rank = TIER_RANK[tier] ?? 0;

  try {
    if (scope === "home" || scope === "dashboard") {
      const allowedIds = rank >= 1 ? Object.keys(TABLES) : FREE_IDS;
      const entries = Object.entries(TABLES).filter(([id]) => allowedIds.includes(id));

      const results = await Promise.all(
        entries.map(async ([id, { table, col }]) => {
          if (rank === 0) {
            const row = (await t1Row(table)) || (await latestRow(table));
            if (!row || row[col] == null) return [id, null];
            return [id, { value: parseFloat(row[col]), timestamp: row.timestamp, delayed: true }];
          }
          const row = await latestRow(table);
          if (!row || row[col] == null) return [id, null];
          return [id, { value: parseFloat(row[col]), timestamp: row.timestamp, delayed: false }];
        })
      );

      return json({ tier, indices: Object.fromEntries(results) });
    }

    if (scope === "risk") {
      // VPIN / VaR / CVaR alerts — Professional tier and above only.
      if (rank < 2) return json({ tier, error: "requires professional tier or above" }, 403);
      const row = await latestRow("quant_risk_jsm3");
      return json({ tier, risk: row });
    }

    if (scope === "history") {
      const id = url.searchParams.get("index") || "";
      if (!TABLES[id]) return json({ error: "unknown index" }, 400);
      if (rank === 0) return json({ tier, error: "history requires a paid plan" }, 403);

      // Analyst: up to 30 days (matches pricing page: "Historical data >30d" is
      // explicitly NOT included below Professional). Professional/Institutional:
      // full history since launch (project created 2026-04-03).
      const maxDays = rank === 1 ? 30 : 4000;
      const since = new Date(Date.now() - maxDays * 24 * 3600 * 1000).toISOString();
      const { table } = TABLES[id];
      const { data } = await sb
        .from(table)
        .select("*")
        .gte("timestamp", since)
        .order("timestamp", { ascending: true })
        .limit(2000);
      return json({ tier, index: id, rows: data || [] });
    }

    return json({ error: "unknown scope" }, 400);
  } catch (e) {
    return json({ error: "internal error", detail: String(e) }, 500);
  }
});
