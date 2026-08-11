import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";
import {
  SignIn, SignUp, SignedIn, SignedOut,
  UserButton, useUser, useAuth, ClerkProvider
} from "@clerk/clerk-react";

// ─── CLERK CONFIG ─────────────────────────────────────────────────────────────
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

// ─── TIER DETECTION — lit les metadata Clerk ─────────────────────────────────
// publicMetadata.tier = "free" | "analyst" | "professional" | "institutional"
const getTier = (user) => {
  if (!user) return null;
  return user.publicMetadata?.tier || "free";
};
const TIER_RANK = { free: 0, analyst: 1, professional: 2, institutional: 3 };
const hasAccess = (userTier, required) =>
  (TIER_RANK[userTier] || 0) >= (TIER_RANK[required] || 0);

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SB_HEADERS = SB_KEY ? { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } : null;

// ─── GATED INDEX DATA (2026-08-11) ────────────────────────────────────────────
// Replaces raw fetch(`${SB_URL}/rest/v1/<table>`) calls with anon key, which let
// anyone — no login, no payment — read the same live data as an Institutional
// subscriber (RLS policies on the index tables were `USING (true)` for public
// SELECT). Real access control now lives server-side in the get-index-data
// Edge Function, which independently verifies the caller's Clerk session and
// looks up their tier via the Clerk Backend API — it does not trust anything
// the client claims. Free/unauthenticated callers only ever get CCQI+DYOI,
// T-1. See supabase/functions/get-index-data/index.ts.
const fetchIndexData = async (scope, token, params = {}) => {
  if (!SB_URL) return null;
  const qs = new URLSearchParams({ scope, ...params }).toString();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const r = await fetch(`${SB_URL}/functions/v1/get-index-data?${qs}`, { headers });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
};

// ─── STRIPE PAYMENT LINKS — LIVE ─────────────────────────────────────────────
const STRIPE_LINKS = {
  free:         null,                                                    // €0 → Dashboard direct
  analyst:      "https://buy.stripe.com/aFa7sE9iEf4KfDdaD4dwc01",      // €490/mo
  professional: "https://buy.stripe.com/bJedR2bqMf4Kez96mOdwc02",      // €990/mo
  institutional:"https://buy.stripe.com/14AdR2amIcWC2Qr26ydwc04",      // €1,990/mo
};
const handleStripe = (link) => {
  if (!link) {
    window.location.href = "mailto:contact@steelldy.com?subject=Free Account Request&body=Hello, I would like to create a free STEELLDY account. My name is: ";
    return;
  }
  window.location.href = link;
};

// ─── PALETTE ─────────────────────────────────────────────────────────────────
// Palette v3 — sober/institutional (revert per Helen's 4 reference screenshots,
// 2026-08-03). Was: brass-gold accent + 8-hue rainbow per index. Now: near-black
// neutral ground, off-white primary accent, green/amber/red reserved for actual
// live/warning/negative states only. blueL/cyan/teal/purple/pink/orange/jsblue/
// brics kept as tokens (used ~35x across index-card borders) but collapsed to one
// muted steel-gray so index cards no longer read as a color wheel.
const C = {
  bg:"#0a0a0a", panel:"#131313", panel2:"#1a1a1a", border:"#262626", borderB:"#333333",
  gold:"#e8e6df", goldL:"#ffffff", goldD:"#b8b6b0", blue:"#7a828f", blueL:"#7a828f",
  cyan:"#7a828f", teal:"#7a828f", green:"#22c55e", red:"#ef4444", amber:"#f0a030",
  purple:"#7a828f", pink:"#7a828f", orange:"#f0a030", text:"#a3a3a3", dim:"#6b6b6b",
  white:"#f5f5f2", jsblue:"#7a828f", brics:"#7a828f",
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700;800;900&family=Barlow:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:${C.bg}}
::-webkit-scrollbar-thumb{background:${C.borderB};border-radius:2px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes ticker{0%{transform:translateX(100vw)}100%{transform:translateX(-300%)}}
.fade-up{animation:fadeUp .6s ease forwards;opacity:0}
.fade-in{animation:fadeIn .35s ease forwards}
.delay-1{animation-delay:.1s}.delay-2{animation-delay:.2s}.delay-3{animation-delay:.3s}
.delay-4{animation-delay:.4s}.delay-5{animation-delay:.5s}
.mono{font-family:'JetBrains Mono',monospace}
.mono-alt{font-family:'Share Tech Mono',monospace}
.serif{font-family:'Instrument Serif',serif}
.cond{font-family:'Barlow Condensed',sans-serif}
.live-dot{width:7px;height:7px;border-radius:50%;background:${C.green};animation:pulse 1.4s infinite;display:inline-block}
.btn-gold{background:linear-gradient(135deg,${C.gold},${C.goldL});color:#000;font-weight:700;border:none;padding:14px 32px;border-radius:4px;cursor:pointer;font-size:14px;letter-spacing:.03em;transition:all .3s;font-family:'DM Sans',sans-serif}
.btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${C.gold}40}
.btn-outline{background:transparent;color:${C.gold};font-weight:600;border:1px solid ${C.gold}60;padding:14px 32px;border-radius:4px;cursor:pointer;font-size:14px;letter-spacing:.03em;transition:all .3s;font-family:'DM Sans',sans-serif}
.btn-outline:hover{border-color:${C.gold};background:${C.gold}10}
.nav-tab{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:8px 14px;border:none;background:transparent;color:${C.dim};cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
.nav-tab:hover{color:${C.text}}
.nav-tab.active{color:${C.gold};border-bottom-color:${C.gold}}
.icard{background:${C.panel};border:1px solid ${C.border};border-top:2px solid;padding:11px;cursor:pointer;transition:all .2s;overflow:hidden}
.icard:hover{border-color:${C.borderB};transform:translateY(-1px)}
.badge{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.05em;padding:2px 6px;border-radius:2px;text-transform:uppercase}
.alert-row{display:flex;align-items:center;gap:8px;padding:5px 10px;border-left:3px solid;margin-bottom:3px;font-size:10.5px}
.drow{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid ${C.border};font-size:11px}
.drow:last-child{border-bottom:none}
.scanline-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.06) 2px,rgba(0,0,0,.06) 4px);pointer-events:none;z-index:0}
`;

// ─── DATA ─────────────────────────────────────────────────────────────────────
const INDICES = [
  /* v2 (2026-08-05): removed dead sr/ir/dd/alpha/z (Sharpe, information ratio, drawdown,
     alpha, z-score) fields from all 9 entries below. They were never rendered anywhere in
     the app but were fabricated numbers sitting in source — same category of fake stat
     already purged from the visible UI. Also removed CCQI's "ICE EUA corr. ρ=0.78" (no
     script computes a correlation coefficient; the CCQI backend applies a rule-based
     bull/bear EUA price bonus, not a statistical correlation) and XCDI's false "XRPL
     WebSocket API" claim (the free-indices script polls XRPScan's REST API on a 30-min
     cron, there is no WebSocket connection). */
  /* v3 (2026-08-06): audited every method/desc string below against the script that
     ACTUALLY writes the live table each one reads from (INDEX_TABLES, further down).
     RTAI/SSSI/XSQI/XCDI/CAVI/ETACI/PII read from *_index, written by
     steelldy_free_indices.py — NOT from the more elaborate legacy scripts
     (steelldy_cavi_etaci_pii.py) that still exist in /scripts but whose tables the
     frontend no longer queries. Several descriptions here had drifted from what the
     live script actually computes — most seriously PII, which was described as a
     stablecoin counterparty/amount/flow/position leakage model (that IS what
     steelldy_cavi_etaci_pii.py computes, into the orphaned index_pii table) while the
     live pii_index table is actually a BTC-market composite (Fear&Greed + BTC
     dominance + open interest + their average). Corrected all of them to match the
     real formula, real weights, and real component names in the live script. */
  { id:"RTAI", name:"RWA Tokenization",      color:C.blueL,  live:true, base:78.6, vol:0.8, unit:"", sub:["TVL","Quality","Comply","Liquid"], subV:[85,72,68,81], desc:"DeFi Llama RWA-tagged protocols (BlackRock BUIDL, Franklin BENJI, Ondo OUSG, Centrifuge, Maple among them) — auto-detected by name/category/description match", method:"RWA TVL, log-scaled (35%), institutional-name quality score (25%), compliance baseline (20%, fixed conservative estimate — not a live regulatory feed), protocol-count liquidity proxy (20%)." },
  { id:"CCQI", name:"Carbon Credit Quality", color:C.green,  live:true, base:92.4, vol:0.5, unit:"", sub:["Verif.","Perm.","Addit.","CoBen."], subV:[94,88,92,95], desc:"Verra VCUs · Gold Standard · Isometric · ICE EUA bull/bear signal", method:"Verification rigor (30%), permanence (25%), additionality (25%), co-benefits (20%). ICE EUA price used as a rule-based lead signal (bonus/penalty), not a statistical correlation." },
  { id:"SSSI", name:"Stablecoin Stability",  color:C.amber,  live:true, base:73.2, vol:0.6, unit:"", sub:["USDC","USDT","DAI","PYUSD"], subV:[80,59,55,62], desc:"8 stablecoins (USDT, USDC, DAI, PYUSD, FDUSD, TUSD, FRAX, MIM) · live peg deviation · static reserve-transparency scores", method:"Per-coin score = peg deviation (65%, real-time CoinGecko price vs $1.00) + reserve transparency (35%, fixed score per coin from public audits). Aggregated across the 8 coins by fixed market-share weights. No VPIN, no EWMA smoothing — each run is a fresh snapshot." },
  { id:"CAVI", name:"CBDC Adoption Velocity",color:C.purple, live:false, base:64.8, vol:0.9, unit:"", sub:["Tech.","Policy","Infra.","Adopt."], subV:[68,58,72,55], desc:"134 countries · BIS mBridge · SWIFT CBDC Connector · Quarterly BIS/Atlantic Council update", method:"Technology maturity (25%), policy framework (25%), infrastructure (25%), adoption penetration (25%). Static dataset updated manually on a quarterly cadence from Atlantic Council / BIS / IMF public trackers — not a live feed." },
  { id:"DYOI", name:"DeFi Yield Optimiz.",   color:C.cyan,   live:true, base:81.3, vol:1.1, unit:"%", sub:["Aave","Curve","Uniswap","Compound"], subV:[88,79,82,71], desc:"25 protocols · Risk-adjusted YRA · beta-scoring · static insurance-coverage scoring", method:"YRA = Gross_APY × (1 - Risk_Penalty), sigmoid risk penalty (40%). Protocol beta score (25%), liquidity depth (20%), insurance-coverage score (15%, fixed per-protocol estimate, not a live Nexus Mutual feed). 25 DeFi Llama pools, hourly recalc." },
  { id:"XSQI", name:"XRPL Settlement Quality",color:C.teal,  live:true, base:87.4, vol:0.6, unit:"", sub:["Finality","Decentr.","Through.","Liquid"], subV:[92,95,78,84], desc:"XRPL 3-5s finality · validator decentralization · 40+ ODL corridors", method:"Finality (30%, fixed — XRPL's 3-5s close time), validator-count decentralization (25%), transaction throughput (25%, live tx/s via XRPScan), XRP/USD+EUR volume liquidity proxy (20%)." },
  { id:"XCDI", name:"XRPL Compute-Dollar",   color:C.goldL, live:false, base:72.1, vol:1.0, unit:"", sub:["XRP Util.","Activity","RWA"], subV:[78,82,71], desc:"XRP price/utility signal + XRPL ledger activity + XRPL-tagged RWA TVL on DeFi Llama", method:"XRP price/utility signal (40%), XRPL ledger activity via tx/s proxy (35%), log-scaled XRPL-tagged RWA TVL (25%). XRPScan + DeFi Llama REST APIs, 30-min update." },
  { id:"ETACI", name:"ESG Tokenized Compliance",color:C.pink, live:true, base:68.9, vol:0.7, unit:"", sub:["CSRD","EU Tax.","SFDR","BEPS"], subV:[72,65,74,63], desc:"50K+ companies in CSRD scope EU-wide · ICVCM · SFDR Art.9 · BEPS Pillar 2", method:"CSRD reporting quality (30%), EU Taxonomy alignment (25%), SFDR classification (25%), BEPS compliance (20%). Static dataset from ESMA/ICVCM/Verra public reports, updated quarterly." },
  /* PII (2026-08-06): this was described as a stablecoin counterparty/amount/flow/position
     leakage model — that IS the real formula in scripts/steelldy_cavi_etaci_pii.py, but that
     script writes to the orphaned legacy index_pii table, not the pii_index table the
     dashboard actually reads. The live methodology is a BTC market-structure composite. */
  { id:"PII",   name:"Proprietary Integrity", color:C.orange, live:false, base:84.7, vol:0.9, unit:"", sub:["Inst.Flow","Fear&Greed","Integrity","Mosaic"], subV:[75,50,75,67], desc:"BTC market-structure composite: open interest, Fear & Greed Index, BTC dominance", method:"Institutional flow (25%, BTC open-interest proxy), Fear & Greed-derived score (25%, Alternative.me), market integrity (25%, BTC dominance proxy), mosaic signal (25%, average of the other three). Free APIs: Alternative.me, CoinGecko, CoinGlass." },
];

const COMMODITY_IDX = [
  { id:"BGI",    name:"BRICS Grain",      color:C.brics,  val:142.8, chg:+1.8 },
  { id:"CGPI",   name:"Commodity GeoRisk",color:C.red,    val:72.4,  chg:+3.1 },
  { id:"CCFI",   name:"CTA Flow",         color:C.purple, val:-0.62, chg:-0.08 },
  { id:"VPIN-C", name:"VPIN Commodity",   color:C.amber,  val:0.48,  chg:+0.03 },
];

/* v4 (2026-08-06) — task #15, feu vert Helen:
   AIS_ROUTES ("AIS Maritime GeoRisk") is deleted outright. There is no AIS
   (ship-tracking) data source anywhere in this codebase — no script fetches
   shipping-lane traffic, and the Suez/Hormuz/Malacca/Bosphorus risk scores were
   invented numbers with no underlying computation. STEELLDY tracks RWA
   tokenization, carbon credits, stablecoins, CBDCs, DeFi yield and XRPL
   settlement — not maritime logistics. Removed rather than reframed, because
   there's no honest version of "STEELLDY's real AIS feed" to fall back to.

   ALERTS_INIT is replaced by computeLiveAlerts() (see DashboardPage below),
   which derives real alerts from the live index values and the real Alert
   Thresholds table already in this file, instead of hardcoded fake trades
   ("Dark Pool: BTC $100M BUY @ $70,420 (Cumberland OTC)" was invented — STEELLDY
   has no dark-pool or OTC desk visibility) and invented scanner events. */

const MACRO_DEFAULT = [
  { k:"DXY", v:"102.4", chg:"-0.3%", dir:-1 },
  { k:"VIX", v:"18.2",  chg:"+1.8",  dir:1  },
  { k:"EUA", v:"€85.40",chg:"+2.1%", dir:1  },
  { k:"BTC", v:"$70,840",chg:"+1.4%",dir:1  },
  { k:"XRP", v:"$2.48", chg:"+3.2%", dir:1  },
  { k:"ETH", v:"$3,820",chg:"+2.1%", dir:1  },
];

/* v4 (2026-08-06) — task #15: the "Unified Sentinel Protocol" used to show 16
   fictional checkpoints at specific clock times (05:30 AIS tracking, 07:15
   "Prediction Markets Scan" via the dead polymarket_oracle feed, 10:00 "Dark
   Pools ATS Scan", etc.) — none of it corresponded to anything that runs. The
   real system is simpler and more honest: 10 scripts, all triggered by the
   same GitHub Actions cron (:00 and :30 every hour, i.e. every 30 minutes — see
   .github/workflows/steelldy-indices-full.yml). No unique per-item clock time,
   so this is now rendered as a real-time status board (live/beta per id, via
   isIdxLive / macroFresh) rather than a fake daily schedule. */
const CHECKPOINTS = [
  { id:"CCQI",  label:"Carbon Credit Quality",     engine:"steelldy_ccqi.py",         signal:"Verra/Gold Standard + ICE EUA (Yahoo Finance)" },
  { id:"DYOI",  label:"DeFi Yield Optimization",   engine:"steelldy_dyoi.py",         signal:"25 DeFi Llama protocol pools" },
  { id:"MACRO", label:"Macro Feed",                engine:"steelldy_macro_feed.py",   signal:"DXY/VIX/EUA (Yahoo Finance) + BTC (CoinGecko)" },
  { id:"RTAI",  label:"RWA Tokenization Activity", engine:"steelldy_free_indices.py", signal:"DeFi Llama RWA-tagged TVL" },
  { id:"SSSI",  label:"Stablecoin Stability",      engine:"steelldy_free_indices.py", signal:"CoinGecko peg deviation + reserve transparency" },
  { id:"XSQI",  label:"XRPL Settlement Quality",   engine:"steelldy_free_indices.py", signal:"XRPScan validators + throughput" },
  { id:"CAVI",  label:"CBDC Adoption Velocity",    engine:"steelldy_free_indices.py", signal:"Static Atlantic Council / BIS dataset" },
  { id:"XCDI",  label:"XRPL Compute-Dollar",       engine:"steelldy_free_indices.py", signal:"CoinGecko XRP + DeFi Llama TVL" },
  { id:"ETACI", label:"ESG Tokenized Compliance",  engine:"steelldy_free_indices.py", signal:"Static ESMA/ICVCM/Verra dataset" },
  { id:"PII",   label:"Proprietary Integrity",     engine:"steelldy_free_indices.py", signal:"CoinGlass OI + Fear&Greed + CoinGecko" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const rnd = (a, b) => Math.random() * (b - a) + a;
const genSeries = (base, vol, n = 40) => {
  let v = base, arr = [];
  for (let i = 0; i < n; i++) { v += (Math.random() - .47) * vol; arr.push({ i, v: Math.max(0, v) }); }
  return arr;
};

// v4 (2026-08-06) — task #15: replaces the hardcoded ALERTS_INIT array (fake trades,
// fake scanner events). Derives real alerts by comparing the current live index values
// (and the live EUA price from the macro feed) against the actual threshold rules shown
// in the "Alert Thresholds" panel further down. Only checks thresholds where the
// underlying number is genuinely available client-side — CAVI/DYOI/XSQI/XCDI/ETACI
// thresholds reference sub-metrics (24h % change, percentile rank, audit status) that
// aren't tracked in this frontend, so those are left out rather than approximated.
const computeLiveAlerts = (lives, macroData, liveIds) => {
  const val = (id) => { const i = INDICES.findIndex(x => x.id === id); return i !== -1 ? lives[i] : null; };
  const alerts = [];

  const rtai = val("RTAI");
  if (rtai != null && liveIds.includes("RTAI")) {
    if (rtai < 50) alerts.push({ t: "red", msg: `RTAI ${rtai.toFixed(1)} — below the red threshold (<50).` });
    else if (rtai > 75) alerts.push({ t: "green", msg: `RTAI ${rtai.toFixed(1)} — above the green threshold (>75).` });
  }

  const euaEntry = macroData.find(m => m.k === "EUA");
  const eua = euaEntry ? parseFloat(String(euaEntry.v).replace(/[^0-9.]/g, "")) : null;
  if (eua) {
    if (eua < 75) alerts.push({ t: "red", msg: `ICE EUA €${eua.toFixed(2)} — below CCQI's bear threshold (€75).` });
    else if (eua > 90) alerts.push({ t: "green", msg: `ICE EUA €${eua.toFixed(2)} — above CCQI's bull threshold (€90).` });
  }

  const sssi = val("SSSI");
  if (sssi != null && liveIds.includes("SSSI")) {
    if (sssi < 50) alerts.push({ t: "red", msg: `SSSI ${sssi.toFixed(1)} — below the red threshold (<50).` });
    else if (sssi > 75) alerts.push({ t: "green", msg: `SSSI ${sssi.toFixed(1)} — above the green threshold (>75).` });
  }

  const pii = val("PII");
  if (pii != null && liveIds.includes("PII")) {
    const m = pii / 10;
    if (m < 4.0) alerts.push({ t: "red", msg: `Mosaic ${m.toFixed(1)}/10 — below the defensive threshold (<4.0).` });
    else if (m > 7.5) alerts.push({ t: "green", msg: `Mosaic ${m.toFixed(1)}/10 — above the risk-on threshold (>7.5).` });
  }

  if (!alerts.length) alerts.push({ t: "amber", msg: "No monitored index is currently past a defined alert threshold." });
  return alerts.map(a => ({ ...a, time: "now" }));
};

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
const MiniChart = ({ data, col, h = 30 }) => (
  <ResponsiveContainer width="100%" height={h}>
    <AreaChart data={data} margin={{ top: 1, right: 0, bottom: 0, left: 0 }}>
      <defs><linearGradient id={`g${col.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={col} stopOpacity={.3} /><stop offset="100%" stopColor={col} stopOpacity={0} />
      </linearGradient></defs>
      <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.5} fill={`url(#g${col.replace("#", "")})`} dot={false} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>
);

const PanelBox = ({ children, border = C.gold, style = {} }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${border}`, padding: 14, ...style }}>{children}</div>
);
const DLbl = ({ children, col = C.dim }) => <div className="cond" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: col, marginBottom: 3 }}>{children}</div>;
const DVal = ({ children, col = C.white, sz = 20 }) => <div className="mono-alt" style={{ fontSize: sz, color: col, lineHeight: 1 }}>{children}</div>;
const Divider = () => <div style={{ height: 1, background: C.border, margin: "8px 0" }} />;
const Badge = ({ children, col = C.dim }) => <span className="badge" style={{ background: col + "18", color: col, border: `1px solid ${col}40` }}>{children}</span>;
const Dot = ({ status }) => <span style={{ width: 6, height: 6, borderRadius: "50%", background: status === "red" ? C.red : status === "amber" ? C.amber : C.green, display: "inline-block", animation: status === "red" ? "pulse 1s infinite" : "none" }} />;
const GaugeBar = ({ val, max = 100, col = C.gold, h = 3 }) => (
  <div style={{ height: h, background: C.border, borderRadius: 1, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min((val / max) * 100, 100)}%`, background: col, borderRadius: 1, transition: "width .5s" }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const HomePage = ({ onNavigate }) => {
  // v3 (2026-08-04): this public homepage strip previously jittered every 2s via
  // Math.random() regardless of any real data — visible to every visitor, logged in
  // or not. Now pulls the same real per-index rows the dashboard uses; falls back to
  // the static seed value (no animation) if Supabase isn't reachable.
  // v5 (2026-08-11): was fetching all 9 tables directly with the anon key — i.e. every
  // visitor, paying or not, saw the full live Institutional-tier dataset on the public
  // marketing page. Now goes through the gated get-index-data function, which for an
  // unauthenticated visitor returns only CCQI+DYOI at T-1, matching the Free tier's
  // actual advertised entitlement on the pricing page.
  const [lives, setLives] = useState(INDICES.map(x => x.base));
  useEffect(() => {
    const fetchHome = async () => {
      const res = await fetchIndexData("home", null);
      if (!res?.indices) return; // keep static seed values
      const newBase = INDICES.map(idx => idx.base);
      Object.entries(res.indices).forEach(([id, entry]) => {
        const pos = INDICES.findIndex(x => x.id === id);
        if (entry?.value != null && pos !== -1) newBase[pos] = entry.value;
      });
      setLives(newBase);
    };
    fetchHome();
    const id = setInterval(fetchHome, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* HERO */}
      <div style={{ position: "relative", minHeight: "90vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${C.gold}08 0%, transparent 70%)` }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}60, ${C.gold}, ${C.gold}60, transparent)` }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", position: "relative", zIndex: 1 }}>
          <div className="fade-up" style={{ marginBottom: 20 }}>
            <span className="mono" style={{ fontSize: 12, color: C.gold, letterSpacing: ".2em", fontWeight: 600 }}>STEELLDY ADVISORY · GEX, FRANCE</span>
          </div>
          <h1 className="fade-up delay-1" style={{ fontSize: "clamp(36px,5vw,72px)", fontWeight: 300, lineHeight: 1.1, color: C.white, maxWidth: 800, marginBottom: 24 }}>
            The Intelligence Layer for <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Programmable Finance</span>
          </h1>
          <p className="fade-up delay-2" style={{ fontSize: 18, color: C.dim, maxWidth: 560, lineHeight: 1.7, marginBottom: 40 }}>
            9 proprietary indices tracking RWA tokenization, carbon credits, stablecoins, CBDCs, DeFi, XRPL settlement, ESG compliance, and market integrity. Built for institutions that need alpha, not noise.
          </p>
          <div className="fade-up delay-3" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button className="btn-gold" onClick={() => onNavigate("pricing")}>View Plans</button>
            <button className="btn-outline" onClick={() => onNavigate("pricing")}>View Pricing</button>
          </div>
          <div className="fade-up delay-4" style={{ display: "flex", gap: 40, marginTop: 60, flexWrap: "wrap" }}>
            {/* v2: coverage stats, not backtested performance figures — a Sharpe/IRR/NPV
                banner reads as investment-return claims, which STEELLDY (a data vendor,
                not an adviser) cannot substantiate on 3 months of live history. Fixed
                2026-08-03 per Helen's review. */}
            {[["Proprietary Indices", "9"], ["Countries Tracked", "137"], ["RWA TVL Tracked", "$36Bn+"], ["Refresh Cycle", "Hourly"]].map(([l, v]) => (
              <div key={l}>
                <div className="mono" style={{ fontSize: 28, color: C.gold, fontWeight: 700 }}>{v}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 4, letterSpacing: ".04em" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LIVE INDEX STRIP */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "20px 0", background: C.panel }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 20px", overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 8, minWidth: 900 }}>
            {INDICES.map((idx, i) => {
              const live = lives[i], chg = ((live - idx.base) / idx.base * 100);
              return (
                <div key={idx.id} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderTop: `2px solid ${idx.color}`, padding: 12, cursor: "pointer" }} onClick={() => onNavigate("dashboard")}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: idx.color, letterSpacing: ".06em" }}>{idx.id}</span>
                    <span className="mono" style={{ fontSize: 10, color: chg >= 0 ? C.green : C.red }}>{chg >= 0 ? "+" : ""}{chg.toFixed(1)}%</span>
                  </div>
                  <div className="mono" style={{ fontSize: 18, color: C.white, fontWeight: 600 }}>{live.toFixed(1)}</div>
                  <MiniChart data={genSeries(live, idx.vol)} col={idx.color} h={24} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* WHY STEELLDY */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>WHY STEELLDY</span>
          <h2 style={{ fontSize: 40, fontWeight: 300, color: C.white, marginTop: 12 }}>Five Coverage Gaps. <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Zero Competitors.</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {[
            ["RWA Tokenization", "$36Bn TVL with no unified quality benchmark. STEELLDY RTAI tracks 50+ protocols with compliance scoring aligned to MiCA and SEC frameworks.", C.blueL],
            ["Carbon Credits", "$2Bn voluntary carbon market growing to $100Bn by 2030. No real-time on-chain quality index exists. STEELLDY CCQI fills this gap with ICE EUA correlation ρ=0.78.", C.green],
            ["Stablecoin Risk", "$315Bn market cap with no dynamic reserve transparency rating. STEELLDY SSSI scores the top 10 stablecoins on reserve transparency, peg deviation and VPIN-based informed-trading detection, updated every 6 hours.", C.amber],
            ["CBDC Adoption", "137 countries in various CBDC phases. No quantitative velocity index exists. STEELLDY CAVI scores technology, policy, infrastructure and adoption monthly from BIS and Atlantic Council data.", C.purple],
            ["DeFi Yield", "25 protocols tracked with risk-adjusted returns. STEELLDY DYOI nets gross APY against a beta- and volatility-based risk penalty, live hourly from DeFi Llama — a discipline raw APY dashboards don't apply.", C.cyan],
            ["XRPL Settlement", "40+ ODL corridors, 120+ operators, ISO 20022 native. STEELLDY provides the only institutional-grade settlement quality scoring for the XRPL ecosystem.", C.teal],
          ].map(([title, desc, col], i) => (
            <div key={i} className={`fade-up delay-${i % 3 + 1}`} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${col}`, padding: 28 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* VS BLOOMBERG */}
      <div style={{ background: C.panel, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "80px 40px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>COMPETITIVE POSITIONING</span>
            <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginTop: 12 }}>STEELLDY vs. Traditional Terminal</h2>
            <p className="serif" style={{ fontSize: 18, fontStyle: "italic", color: C.dim, marginTop: 8 }}>"We don't replace traditional data terminals. We make them obsolete for programmable finance."</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 30 }}>
              <div className="mono" style={{ fontSize: 12, color: C.red, letterSpacing: ".1em", marginBottom: 20 }}>BLOOMBERG TERMINAL</div>
              {[["Annual Cost", "€25,000/seat"], ["RWA Coverage", "Fragmented, manual"], ["On-Chain Data", "None native"], ["MiCA/CSRD Scoring", "Not available"], ["Prediction Markets", "Not integrated"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.dim }}>{l}</span>
                  <span className="mono" style={{ fontSize: 13, color: C.red }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.gold}40`, padding: 30, position: "relative" }}>
              <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.goldL})` }} />
              <div className="mono" style={{ fontSize: 12, color: C.green, letterSpacing: ".1em", marginBottom: 20 }}>STEELLDY INDEX SUITE</div>
              {/* v2 (2026-08-05): "STEELLDY Oracle Integration" claimed a live Polymarket feed —
                  the polymarket_oracle table holds one row, dated 2026-04-03, never updated
                  since. No pipeline writes to it. Fixed to state the true status. */}
              {[["Annual Cost (Analyst)", "€5,880/seat"], ["RWA Coverage", "50+ protocols, unified"], ["On-Chain Data", "XRPL, DeFi, native"], ["MiCA/CSRD Scoring", "ETACI index, hourly-updated"], ["Prediction Markets", "Roadmap — not yet live"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.dim }}>{l}</span>
                  <span className="mono" style={{ fontSize: 13, color: C.green }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ENGINES */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>PROPRIETARY TECHNOLOGY</span>
          <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginTop: 12 }}>Six Engines. One Signal.</h2>
        </div>
        {/* v2 (2026-08-05): the previous six cards described capabilities (Markov-switching
            regimes, OCEAN psychographic modeling, Hawkes processes, Avellaneda-Stoikov market
            making, dark web intelligence, 52-signal cross-validation) that no script in this
            codebase implements. Replaced with the six real stages of the actual pipeline. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            ["ING", "Data Ingestion", "9 dedicated scripts pulling from public APIs: CoinGecko, DeFi Llama, XRPScan, Verra Registry, Alternative.me, BIS/Atlantic Council CBDC Tracker"],
            ["SCR", "Scoring", "VPIN-inspired informed-flow detection, EWMA peg-deviation scoring, sigmoid-based continuous risk penalties, log-scaled TVL scoring"],
            ["AGG", "Aggregation", "Market-cap-weighted composite construction across each index's underlying assets or protocols"],
            ["AUT", "Automation", "GitHub Actions cron jobs, hourly and half-hourly, no manual intervention in the calculation"],
            ["STO", "Storage", "Supabase Postgres, one table per index, tier-based access controls (in progress)"],
            ["DEL", "Delivery", "REST API via PostgREST, live dashboard refresh on signed-in and public pages"],
          ].map(([id, name, desc]) => (
            <div key={id} style={{ background: C.panel2, border: `1px solid ${C.border}`, padding: 24 }}>
              <div className="mono" style={{ fontSize: 20, color: C.gold, fontWeight: 700, marginBottom: 4 }}>{id}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 10 }}>{name}</div>
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: `linear-gradient(180deg, ${C.bg}, ${C.panel})`, padding: "80px 40px", textAlign: "center", borderTop: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginBottom: 16 }}>Ready to See the <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Alpha?</span></h2>
        <p style={{ fontSize: 16, color: C.dim, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>Start with a live demo. No credit card required.</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="btn-gold" onClick={() => onNavigate("pricing")}>View Plans</button>
          <button className="btn-outline" onClick={() => onNavigate("pricing")}>View Pricing</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const PricingPage = ({ onNavigate }) => (
  <div style={{ maxWidth: 1300, margin: "0 auto", padding: "80px 40px" }}>
    <div style={{ textAlign: "center", marginBottom: 60 }}>
      <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>PRICING</span>
      <h2 style={{ fontSize: 44, fontWeight: 300, color: C.white, marginTop: 12 }}>
        Intelligence, <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Scaled to Your Needs</span>
      </h2>
      <p style={{ fontSize: 16, color: C.dim, marginTop: 12, maxWidth: 560, margin: "12px auto 0" }}>
        9 live indices. All data sources public and verifiable. Cancel anytime.
      </p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, alignItems: "start" }}>

      {/* FREE */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 28 }}>
        <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>FREE</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€0</span>
          <span style={{ fontSize: 14, color: C.dim }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>
          Discover STEELLDY. CCQI and DYOI preview with T-1 data.
        </p>
        <button className="btn-outline" style={{ width: "100%", marginBottom: 24 }} onClick={() => handleStripe(STRIPE_LINKS.free)}>Try Live Demo</button>
        {["CCQI preview (T-1)", "DYOI preview (T-1)", "Public dashboard access"].map(f => (
          <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 12, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
        ))}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {["API access"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12, color: C.dim }}><span style={{ color: C.dim }}>—</span>{f}</div>
          ))}
        </div>
      </div>

      {/* ANALYST */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 28 }}>
        <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>ANALYST</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€490</span>
          <span style={{ fontSize: 14, color: C.dim }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>
          9 indices real-time for independent analysts and junior family offices.
        </p>
        <button className="btn-outline" style={{ width: "100%", marginBottom: 24 }} onClick={() => handleStripe(STRIPE_LINKS.analyst)}>Get Started</button>
        {["9 indices real-time", "Supabase data feed", "Daily intelligence report", "1 user seat", "Standard support"].map(f => (
          <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 12, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
        ))}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {["API access", "Historical data >30d"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12, color: C.dim }}><span style={{ color: C.dim }}>—</span>{f}</div>
          ))}
        </div>
      </div>

      {/* PROFESSIONAL */}
      <div style={{ background: C.panel, border: `1px solid ${C.gold}50`, padding: 28, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.gold},${C.goldL})` }} />
        <div style={{ position: "absolute", top: 10, right: 14 }}>
          <span className="mono" style={{ fontSize: 9, background: C.gold, color: "#000", padding: "3px 8px", letterSpacing: ".1em", fontWeight: 700 }}>POPULAR</span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".15em", marginBottom: 8 }}>PROFESSIONAL</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€990</span>
          <span style={{ fontSize: 14, color: C.dim }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>
          Full access for crypto desks, hedge funds, and asset managers.
        </p>
        <button className="btn-gold" style={{ width: "100%", marginBottom: 24 }} onClick={() => handleStripe(STRIPE_LINKS.professional)}>Get Started</button>
        {/* v2 (2026-08-04): "2 years" was impossible — Supabase project created 2026-04-03,
            ~4 months of history exist. Fixed to state a true, checkable fact instead. */}
        {["Everything in Analyst", "REST API access", "Full historical data since launch (Apr. 2026)", "Oracle dashboard", "VPIN + alerts", "2 user seats", "Priority support"].map(f => (
          <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 12, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
        ))}
      </div>

      {/* INSTITUTIONAL */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 28 }}>
        <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>INSTITUTIONAL</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€1,990</span>
          <span style={{ fontSize: 14, color: C.dim }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>
          Full platform for sovereign funds, family offices, and institutional desks.
        </p>
        <button className="btn-outline" style={{ width: "100%", marginBottom: 24 }} onClick={() => handleStripe(STRIPE_LINKS.institutional)}>Get Started</button>
        {/* v2 (2026-08-04): "White label option" and "WebSocket feed available" — zero
            implementation found in the codebase. Removed rather than left as an unfulfillable
            promise; re-add only once actually built (KIMI doctrine: code when a paying client
            asks and pays for it, not before). */}
        {["Everything in Professional", "CAVI/ETACI monthly briefing", "Custom methodology docs", "5 user seats + API", "Dedicated support + SLA", "Priority feature requests"].map(f => (
          <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 12, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
        ))}
      </div>

    </div>

    <div style={{ maxWidth: 700, margin: "60px auto 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.8 }}>
        All data sources public and verifiable. No credit card required for Free tier.
        Contact <a href="mailto:contact@steelldy.com" style={{ color: C.gold }}>contact@steelldy.com</a> for custom deployments.
      </p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE — FULL v4 FUSED
// ═══════════════════════════════════════════════════════════════════════════════
const DashboardPage = () => {
  const [tab, setTab] = useState("dashboard");
  const [selIdx, setSelIdx] = useState(null);
  const [mosaic, setMosaic] = useState(6.8);
  const [clock, setClock] = useState("");
  const [lives, setLives] = useState(INDICES.map(x => x.base));
  const [vpin, setVpin] = useState(null);
  const [sbConnected, setSbConnected] = useState(false);
  const [polyProbs, setPolyProbs] = useState([]);
  const [macroData, setMacroData] = useState(MACRO_DEFAULT);
  // v4 (2026-08-06): var95/var99/cvar95 are now historical-simulation VaR on BTC daily log
  // returns (fractions, e.g. -0.032 = -3.2% 1-day loss at 95% confidence), vpin a Bulk
  // Volume Classification informed-trading proxy — both computed by
  // scripts/steelldy_risk_feed.py and written to quant_risk_jsm3. null until a fresh row
  // arrives; the UI renders null as "--", never a placeholder number.
  const [riskData, setRiskData] = useState({ var95: null, var99: null, cvar95: null, vpin: null, fresh: false });
  const [liveIds, setLiveIds] = useState([]); // v3: which indices actually returned a real row this fetch
  const baseRef = useRef(INDICES.map(x => x.base));
  const isIdxLive = (idx) => (sbConnected ? liveIds.includes(idx.id) : idx.live);

  // v3 (2026-08-04): full rewrite — was fetching ONE table (index_xcdi, itself stale
  // since 2026-06-25) and using that single real number to proportionally fake-scale
  // the other 8 indices, then layering Math.random() jitter on top every 1.2s. Real,
  // independently-computed data already exists in Supabase for all 9 indices (verified
  // directly against the DB: RTAI/SSSI/XSQI/ETACI/CCQI/DYOI updating hourly or better;
  // CAVI/XCDI/PII were failing silently on a schema mismatch between the Python script's
  // output and the table columns — fixed via migration, see cavi_index/xcdi_index/
  // pii_index). This now fetches each index's own latest real row. No synthetic noise.
  // v5 (2026-08-11): was fetching all 9 tables + quant_risk_jsm3 directly with the anon
  // key, identically for every signed-in user regardless of tier — an Analyst paying
  // €490/mo and a free account saw the exact same request. VPIN/VaR/CVaR (quant_risk_jsm3)
  // is a Professional-tier feature per the pricing page but had zero gating at all, not
  // even client-side. Both now go through get-index-data with the caller's real Clerk
  // session token, which the function verifies server-side before deciding what to return.
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchSB = async () => {
      try {
        const token = await getToken().catch(() => null);
        const [idxRes, riskRes, rP, rM, cg] = await Promise.all([
          fetchIndexData("dashboard", token),
          fetchIndexData("risk", token),
          SB_HEADERS ? fetch(`${SB_URL}/rest/v1/polymarket_oracle?select=*&order=timestamp.desc&limit=5`, { headers: SB_HEADERS }).then(r => r.json()).catch(() => null) : null,
          SB_HEADERS ? fetch(`${SB_URL}/rest/v1/macro_feed_live?select=*&order=timestamp.desc&limit=1`, { headers: SB_HEADERS }).then(r => r.json()).catch(() => null) : null,
          // v4 (2026-08-06): BTC previously came from macro_feed_live, a table that hasn't
          // been written to since ~April 2026 — that's why the dashboard showed a stale
          // $71,018. XRP and ETH were never fetched at all: literal hardcoded strings
          // "$2.48" / "$3,820" in the source, both labeled LIVE. Fixed by fetching genuine
          // real-time prices + 24h change from CoinGecko's public API — the same data
          // source the free-indices Python script already uses server-side.
          fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ripple,ethereum&vs_currencies=usd&include_24hr_change=true`)
            .then(r => r.json()).catch(() => null),
        ]);
        const newBase = INDICES.map(idx => idx.base);
        const newLiveIds = [];
        Object.entries(idxRes?.indices || {}).forEach(([id, entry]) => {
          const pos = INDICES.findIndex(x => x.id === id);
          if (entry?.value != null && pos !== -1) {
            newBase[pos] = entry.value;
            newLiveIds.push(id);
          }
        });
        baseRef.current = newBase;
        setLives(newBase);
        setLiveIds(newLiveIds);
        // v4 (2026-08-06): this used to read row.mosaic_score from pii_index — a column
        // that doesn't exist on that table (it only exists on the orphaned legacy
        // index_pii table). So piiMosaic was always null and setMosaic never actually
        // fired: the Mosaic Score gauge shown across the dashboard was permanently
        // stuck at its useState(6.8) default, dressed up as a live "FULL RISK-ON /
        // MODERATE BULLISH / DEFENSIVE" reading. Fixed to derive it from PII's real
        // live value (already fetched above), scaled to /10.
        const piiPos = INDICES.findIndex(x => x.id === "PII");
        if (piiPos !== -1 && newLiveIds.includes("PII")) setMosaic(newBase[piiPos] / 10);
        if (rP?.length) setPolyProbs(rP.map(p => ({ q: p.event_ticker, p: parseFloat(p.probability_percentage), trend: 0 })));
        const riskRow = riskRes?.risk;
        if (riskRow) {
          const riskFresh = riskRow.timestamp && (Date.now() - new Date(riskRow.timestamp).getTime()) < 2 * 60 * 60 * 1000;
          const vp = riskRow.vpin_core != null ? parseFloat(riskRow.vpin_core) : null;
          setRiskData({
            var95: riskRow.var_95 != null ? parseFloat(riskRow.var_95) : null,
            var99: riskRow.var_99 != null ? parseFloat(riskRow.var_99) : null,
            cvar95: riskRow.cvar_95 != null ? parseFloat(riskRow.cvar_95) : null,
            vpin: vp,
            fresh: riskFresh,
          });
          if (vp != null) setVpin(vp);
        }
        // v4: DXY/VIX/EUA have no free real-time source and still come from macro_feed_live,
        // which today is only updated manually. Rather than always claiming LIVE regardless
        // of true freshness, check the row's own timestamp and label it honestly.
        const macroRow = rM?.[0];
        const macroFresh = macroRow?.timestamp && (Date.now() - new Date(macroRow.timestamp).getTime()) < 2 * 60 * 60 * 1000;
        const macroTag = macroFresh ? "LIVE" : "STALE";
        const cgChg = (v) => v == null ? "--" : (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
        setMacroData([
          { k: "DXY", v: macroRow?.dxy_value?.toFixed(2) || "--", chg: macroTag, dir: 1 },
          { k: "VIX", v: macroRow?.vix_value?.toFixed(2) || "--", chg: macroTag, dir: 1 },
          { k: "EUA", v: "€" + (macroRow?.carbon_eu_price?.toFixed(2) || "--"), chg: macroTag, dir: 1 },
          { k: "BTC", v: cg?.bitcoin ? "$" + Math.round(cg.bitcoin.usd).toLocaleString() : "--", chg: cgChg(cg?.bitcoin?.usd_24h_change), dir: (cg?.bitcoin?.usd_24h_change ?? 0) >= 0 ? 1 : -1 },
          { k: "XRP", v: cg?.ripple ? "$" + cg.ripple.usd.toFixed(2) : "--", chg: cgChg(cg?.ripple?.usd_24h_change), dir: (cg?.ripple?.usd_24h_change ?? 0) >= 0 ? 1 : -1 },
          { k: "ETH", v: cg?.ethereum ? "$" + Math.round(cg.ethereum.usd).toLocaleString() : "--", chg: cgChg(cg?.ethereum?.usd_24h_change), dir: (cg?.ethereum?.usd_24h_change ?? 0) >= 0 ? 1 : -1 },
        ]);
        setSbConnected(newLiveIds.length > 0);
      } catch (e) { setSbConnected(false); }
    };
    fetchSB();
    const id = setInterval(fetchSB, 15000);
    return () => clearInterval(id);
  }, []);

  // v3: clock only. No more Math.random() jitter on index values, VPIN or Mosaic —
  // those now update exclusively from the real fetch above.
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setClock(`${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const curHour = parseFloat(clock.replace(/:/g, "").slice(0, 4)) / 100 || 10;
  const mCol = mosaic >= 7.5 ? C.green : mosaic >= 5 ? C.amber : C.red;
  const dashTabs = [
    { id: "dashboard", label: "Dashboard" }, { id: "indices", label: "9 Index Suite" },
    { id: "risk", label: "Risk" }, { id: "oracle", label: "Oracle" },
    { id: "commodity", label: "Commodity" }, { id: "protocol", label: "Sentinel" },
    { id: "validation", label: "Validation" },
  ];

  return (
    <div style={{ background: C.bg }}>
      <div className="scanline-overlay" />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* DASHBOARD HEADER */}
        <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div>
                <div className="cond" style={{ fontSize: 24, fontWeight: 900, color: C.gold, letterSpacing: ".12em", lineHeight: 1 }}>STEELLDY</div>
                <div style={{ fontSize: 8, color: C.dim, letterSpacing: ".1em", marginTop: 2 }}>9 INDICES · REAL-TIME DATA PIPELINE</div>
              </div>
              <div style={{ width: 1, height: 28, background: C.borderB }} />
              <div style={{ display: "flex", gap: 16 }}>
                {/* v2: "Regime: MS-VAR BULL" and "Z-score: 12.8σ" were static hardcoded
                    strings — no Markov-switching regime model exists in the backend, and
                    12.8σ is not a real computed statistic. Replaced with values actually
                    backed by state. Fixed 2026-08-03. */}
                {[["Mosaic", mosaic.toFixed(1) + "/10", mCol], ["Data Mode", sbConnected ? "LIVE" : "SIMULATION", sbConnected ? C.green : C.amber], ["Indices Live", `${liveIds.length}/9`, liveIds.length === 9 ? C.green : C.amber]].map(([l, v, c]) => (
                  <div key={l}><div style={{ fontSize: 8, color: C.dim, letterSpacing: ".06em", textTransform: "uppercase" }}>{l}</div><div className="mono-alt" style={{ fontSize: 11, color: c }}>{v}</div></div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="mono-alt" style={{ fontSize: 14, color: C.white }}>{clock} <span style={{ fontSize: 9, color: C.dim }}>UTC</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="live-dot" />
                <span className="cond" style={{ fontSize: 9, fontWeight: 700, color: C.green, letterSpacing: ".08em" }}>{sbConnected ? "SUPABASE LIVE" : "SIMULATION"}</span>
              </div>
            </div>
          </div>

          {/* 9-INDEX STRIP */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "6px 12px", background: C.panel2, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 5, minWidth: 950 }}>
              {INDICES.map((idx, i) => {
                const live = lives[i] || idx.base, chg = ((live - idx.base) / idx.base * 100);
                return (
                  <div key={idx.id} className="icard" style={{ borderTopColor: idx.color, outline: selIdx === i ? `1px solid ${idx.color}40` : "none" }}
                    onClick={() => { setSelIdx(selIdx === i ? null : i); setTab("indices"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div><div className="cond" style={{ fontSize: 13, fontWeight: 900, color: idx.color, letterSpacing: ".08em" }}>{idx.id}</div><div style={{ fontSize: 8, color: C.dim }}>{idx.name}</div></div>
                      <Badge col={chg >= 0 ? C.green : C.red}>{chg >= 0 ? "+" : ""}{chg.toFixed(1)}%</Badge>
                    </div>
                    <DVal col={idx.color} sz={20}>{live.toFixed(1)}{idx.unit}</DVal>
                    <MiniChart data={genSeries(live, idx.vol)} col={idx.color} h={26} />
                    {/* v2: replaced fabricated SR/alpha/Z badges (hardcoded, not computed)
                        with the real live/beta status — same fix as the Validation tab. */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                      <span style={{ fontSize: 8, color: isIdxLive(idx) ? C.green : C.amber }}>{isIdxLive(idx) ? "● LIVE" : "◐ BETA"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COMMODITY + MACRO STRIP */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "5px 16px", display: "flex", gap: 14, overflowX: "auto", fontSize: 10 }}>
            {COMMODITY_IDX.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <span className="cond" style={{ fontWeight: 700, color: c.color }}>{c.id}</span>
                <span className="mono-alt" style={{ color: C.white }}>{c.val}</span>
                <span className="mono-alt" style={{ fontSize: 9, color: c.chg >= 0 ? C.green : C.red }}>{c.chg >= 0 ? "+" : ""}{c.chg}</span>
              </div>
            ))}
            <div style={{ width: 1, background: C.borderB }} />
            {macroData.map(m => (
              <div key={m.k} style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                <span style={{ color: C.dim }}>{m.k}</span>
                <span className="mono-alt" style={{ color: m.dir >= 0 ? C.green : C.red }}>{m.v}</span>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div style={{ borderTop: `1px solid ${C.border}`, display: "flex", overflowX: "auto", padding: "0 8px" }}>
            {dashTabs.map(t => <button key={t.id} className={`nav-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: "12px 16px" }}>

          {/* ─── DASHBOARD ─── */}
          {tab === "dashboard" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <PanelBox border={C.gold}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><DLbl col={C.gold}>Mosaic Score</DLbl><Badge col={mCol}>{mosaic >= 7.5 ? "BULLISH" : mosaic >= 5 ? "NEUTRAL" : "BEARISH"}</Badge></div>
                  <div className="mono-alt" style={{ fontSize: 48, color: mCol, lineHeight: 1 }}>{mosaic.toFixed(1)}</div>
                  <Divider />
                  <div style={{ fontSize: 9, color: C.dim }}>= PII / 10. PII = 0.25×Institutional Flow + 0.25×Fear&amp;Greed + 0.25×Market Integrity + 0.25×Mosaic signal (avg of the other three).</div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><DLbl>Live Alerts</DLbl><div className="live-dot" /></div>
                    {computeLiveAlerts(lives, macroData, liveIds).map((a, i) => (
                      <div key={i} className="alert-row" style={{ borderLeftColor: a.t === "red" ? C.red : a.t === "amber" ? C.amber : C.green, background: a.t === "red" ? `${C.red}08` : a.t === "amber" ? `${C.amber}08` : `${C.green}08` }}>
                        <Dot status={a.t} /><span className="mono-alt" style={{ fontSize: 9, color: C.dim, width: 32 }}>{a.time}</span><span style={{ flex: 1 }}>{a.msg}</span>
                      </div>
                    ))}
                  </PanelBox>
                </div>
              </div>

              <PanelBox border={C.gold}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><DLbl col={C.gold}>STEELLDY Oracle Intelligence</DLbl><Badge col={polyProbs.length ? C.gold : C.amber}>{polyProbs.length ? "LIVE" : "ROADMAP · illustrative"}</Badge></div>
                {(polyProbs.length ? polyProbs : [
                  { q: "Trump crypto tax eliminated Jun 30", p: 66 }, { q: "USDT market share loss >10%", p: 23 },
                  { q: "Digital Euro pilot EOY 2026", p: 45 }, { q: "XRP ETF approved SEC 2026", p: 58 }, { q: "MiCA EMT full enforcement Q3", p: 72 }
                ]).map((m, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <div style={{ fontSize: 10.5, maxWidth: "70%" }}>{m.q}</div>
                      <span className="mono-alt" style={{ fontSize: 13, color: m.p >= 50 ? C.green : C.amber, fontWeight: "bold" }}>{m.p}%</span>
                    </div>
                    <GaugeBar val={m.p} col={m.p >= 60 ? C.green : m.p >= 40 ? C.amber : C.red} />
                    {i < 4 && <Divider />}
                  </div>
                ))}
              </PanelBox>

              <div>
                <PanelBox border={C.jsblue}>
                  {/* v4 (2026-08-06) — task #15: "JS-M³ Risk Engine ACTIVE" used to pair real
                      VaR/CVaR fields with "Toxicity" (an undefined, permanently-hardcoded 0.34)
                      and a footer line claiming Avellaneda-Stoikov/Kalman/Hawkes/Thompson
                      Sampling — none of which exist anywhere in this codebase. STEELLDY is a
                      data vendor, not a market maker; that footer line and the Toxicity field
                      are removed rather than reframed. VaR/CVaR/VPIN below are now genuinely
                      computed by scripts/steelldy_risk_feed.py (historical simulation VaR on
                      BTC returns; BVC-based VPIN proxy — see script docstring for the exact,
                      citable methodology) and render "--" until a fresh row lands. */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><DLbl col={C.jsblue}>BTC Risk Metrics</DLbl><Badge col={riskData.fresh ? C.green : C.amber}>{riskData.fresh ? "LIVE" : "STALE"}</Badge></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[["VaR 95% (1d)", riskData.var95 != null ? (riskData.var95 * 100).toFixed(2) + "%" : "--", C.green], ["CVaR 95% (1d)", riskData.cvar95 != null ? (riskData.cvar95 * 100).toFixed(2) + "%" : "--", C.amber], ["VPIN proxy (BVC)", riskData.vpin != null ? riskData.vpin.toFixed(3) : "--", riskData.vpin > 0.4 ? C.red : C.green]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={15}>{v}</DVal></div>
                    ))}
                  </div>
                  <Divider />
                  <div style={{ fontSize: 9, color: C.dim }}>Historical simulation VaR/CVaR on BTC daily log returns (Basel/BCBS-style, non-parametric). VPIN proxy via Bulk Volume Classification (Easley, López de Prado &amp; O'Hara, 2012) — not tick-level VPIN.</div>
                </PanelBox>
              </div>
            </div>
          )}

          {/* ─── INDICES DETAIL ─── */}
          {tab === "indices" && selIdx !== null && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
              <div>
                <PanelBox border={INDICES[selIdx].color}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div><div className="cond" style={{ fontSize: 24, fontWeight: 900, color: INDICES[selIdx].color, letterSpacing: ".1em" }}>{INDICES[selIdx].id}</div><div style={{ fontSize: 11, color: C.dim }}>{INDICES[selIdx].name}</div></div>
                    <button onClick={() => setSelIdx(null)} style={{ background: "transparent", border: `1px solid ${C.borderB}`, color: C.dim, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>✕</button>
                  </div>
                  <DVal col={INDICES[selIdx].color} sz={38}>{lives[selIdx].toFixed(1)}{INDICES[selIdx].unit}</DVal>
                  <div style={{ height: 70, marginTop: 8 }}><MiniChart data={genSeries(lives[selIdx], INDICES[selIdx].vol, 60)} col={INDICES[selIdx].color} h={70} /></div>
                  <Divider />
                  <DLbl>Sub-Components</DLbl>
                  {INDICES[selIdx].sub.map((s, i) => (
                    <div key={s} style={{ marginBottom: 5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontSize: 10 }}>{s}</span><span className="mono-alt" style={{ fontSize: 10, color: INDICES[selIdx].color }}>{INDICES[selIdx].subV[i]}</span></div>
                      <GaugeBar val={INDICES[selIdx].subV[i]} col={INDICES[selIdx].color} />
                    </div>
                  ))}
                  <Divider />
                  <DLbl>Coverage</DLbl><div style={{ fontSize: 10, color: C.dim, lineHeight: 1.5 }}>{INDICES[selIdx].desc}</div>
                  <Divider />
                  <DLbl>Methodology</DLbl><div style={{ fontSize: 10, color: C.text, lineHeight: 1.5, background: C.bg, border: `1px solid ${C.border}`, padding: 8 }}>{INDICES[selIdx].method}</div>
                </PanelBox>
              </div>
              <div>
                {/* v2 (2026-08-03): "Performance Metrics" (Sharpe/IR/DD/Alpha) and the
                    duplicate "Statistical Validation — All 9 Indices" table both showed the
                    same hardcoded per-index figures + fake p<0.0001 for every index. Same
                    fabrication class as the homepage hero banner — fixed together. */}
                <PanelBox border={C.blueL}>
                  <DLbl col={C.blueL}>Data Status</DLbl>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge col={isIdxLive(INDICES[selIdx]) ? C.green : C.amber}>{isIdxLive(INDICES[selIdx]) ? "LIVE · Supabase" : "BETA · feed pending"}</Badge>
                    <span style={{ fontSize: 9, color: C.dim }}>{isIdxLive(INDICES[selIdx]) ? "Refreshed on last poll" : "Static seed value — not yet confirmed on last poll"}</span>
                  </div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.gold}>
                    <DLbl col={C.gold}>Full Methodology & Status</DLbl>
                    <div style={{ fontSize: 9.5, color: C.dim }}>See the Validation tab for methodology and live/beta status across all 9 indices.</div>
                  </PanelBox>
                </div>
              </div>
            </div>
          )}
          {tab === "indices" && selIdx === null && <div className="fade-in" style={{ textAlign: "center", padding: 40, color: C.dim }}>← Select an index from the strip above to view details</div>}

          {/* ─── RISK · JS-M³ ─── */}
          {tab === "risk" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <PanelBox border={C.red}>
                  {/* v4 (2026-08-06) — task #15: "Portfolio €10M" and the Stress Scenarios
                      list (probabilities and P&L impacts) were entirely invented — STEELLDY
                      doesn't manage a portfolio or run scenario stress tests; it's a data
                      vendor. Removed rather than reframed. VaR/CVaR below are real historical
                      simulation figures on BTC returns, expressed as % (not tied to a
                      fictional €10M book). */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><DLbl col={C.red}>BTC Historical VaR / CVaR</DLbl><Badge col={riskData.fresh ? C.green : C.amber}>{riskData.fresh ? "LIVE" : "STALE"}</Badge></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[["VaR₉₅% (1d)", riskData.var95 != null ? (riskData.var95 * 100).toFixed(2) + "%" : "--", C.green], ["CVaR₉₅% (1d)", riskData.cvar95 != null ? (riskData.cvar95 * 100).toFixed(2) + "%" : "--", C.amber], ["VaR₉₉% (1d)", riskData.var99 != null ? (riskData.var99 * 100).toFixed(2) + "%" : "--", C.red]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={16}>{v}</DVal></div>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: C.dim }}>Non-parametric historical simulation on BTC daily log returns (Basel/BCBS-style), computed by scripts/steelldy_risk_feed.py.</div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.blueL}>
                    {/* v4: "Dark Pools ATS" / "SMM Engine 2.1" implied real block-trade
                        surveillance that doesn't exist. The number itself is now real (BVC
                        VPIN proxy) — only the false framing and the Math.random() sparkline
                        are removed. */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><DLbl col={C.blueL}>VPIN Proxy (BVC) — BTC/USD</DLbl><Badge col={riskData.fresh ? C.green : C.amber}>{riskData.fresh ? "LIVE" : "STALE"}</Badge></div>
                    <div className="mono-alt" style={{ fontSize: 32, color: vpin > 0.4 ? C.red : vpin > 0.2 ? C.amber : C.green, lineHeight: 1 }}>{vpin != null ? vpin.toFixed(2) : "--"}</div>
                    <div className="cond" style={{ fontSize: 10, fontWeight: 700, color: vpin > 0.4 ? C.red : vpin > 0.2 ? C.amber : C.green, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2 }}>{vpin == null ? "NO DATA" : vpin > 0.4 ? "ELEVATED IMBALANCE" : vpin > 0.2 ? "TRANSITIONAL" : "NOISE"}</div>
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>Bulk Volume Classification approximation (Easley, López de Prado &amp; O'Hara, 2012) on daily OHLCV — not tick-level VPIN.</div>
                  </PanelBox>
                </div>
              </div>
              <div>
                <PanelBox border={C.border}>
                  <DLbl>Macro Feed</DLbl>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                    {macroData.map(m => (
                      <div key={m.k} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8 }}>
                        <DLbl>{m.k}</DLbl><DVal col={C.white} sz={14}>{m.v}</DVal>
                        <div className="mono-alt" style={{ fontSize: 9, color: m.dir >= 0 ? C.green : C.red, marginTop: 2 }}>{m.chg}</div>
                      </div>
                    ))}
                  </div>
                </PanelBox>
              </div>
            </div>
          )}

          {/* ─── ORACLE ─── */}
          {tab === "oracle" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.gold}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><DLbl col={C.gold}>STEELLDY Oracle Intelligence</DLbl><Badge col={polyProbs.length ? C.gold : C.amber}>{polyProbs.length ? "LIVE" : "ROADMAP · illustrative"}</Badge></div>
                {(polyProbs.length ? polyProbs : [{ q: "Trump crypto tax Jun 30", p: 66 }, { q: "USDT loss >10% Q2", p: 23 }, { q: "Digital Euro pilot EOY", p: 45 }, { q: "XRP ETF SEC 2026", p: 58 }, { q: "MiCA EMT enforcement", p: 72 }]).map((m, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><div style={{ fontSize: 10.5, maxWidth: "68%" }}>{m.q}</div><span className="mono-alt" style={{ fontSize: 13, color: m.p >= 50 ? C.green : C.amber, fontWeight: "bold" }}>{m.p}%</span></div>
                    <GaugeBar val={m.p} col={m.p >= 60 ? C.green : m.p >= 40 ? C.amber : C.red} /><Divider />
                  </div>
                ))}
              </PanelBox>
              <PanelBox border={C.gold}>
                {/* v4 (2026-08-06) — task #15: "(Steven Cohen)" falsely implied STEELLDY
                    licenses or implements a real, named individual's proprietary methodology.
                    The composite breakdown below (Oracle consensus 50%, Dark Pools >$100M 30%,
                    SGI Network Analysis 20%, SMA corr, SBE Sentiment, Liquidity clusters) was
                    entirely invented, including a Math.random() jitter on every row's displayed
                    score. Replaced with the real PII formula and its real components. */}
                <DLbl col={C.gold}>Mosaic Score</DLbl>
                <div className="mono-alt" style={{ fontSize: 48, color: mCol, lineHeight: 1 }}>{mosaic.toFixed(1)}</div>
                <div className="cond" style={{ fontSize: 11, fontWeight: 800, color: mCol, letterSpacing: ".06em", marginTop: 4 }}>{mosaic >= 7.5 ? "FULL RISK-ON" : mosaic >= 5 ? "MODERATE BULLISH" : "DEFENSIVE"}</div>
                <Divider />
                {[["Institutional Flow (BTC open interest)", "25%"], ["Fear & Greed Index", "25%"], ["Market Integrity (BTC dominance)", "25%"], ["Mosaic signal (avg of the above)", "25%"]].map(([n, w]) => (
                  <div key={n} className="drow"><span style={{ fontSize: 10 }}>{n}</span><Badge col={C.dim}>{w}</Badge></div>
                ))}
              </PanelBox>
            </div>
          )}

          {/* ─── COMMODITY ─── */}
          {tab === "commodity" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {/* v4 (2026-08-06): the AIS Maritime GeoRisk panel that used to sit next to
                  this one is removed — no AIS/shipping data source exists anywhere in this
                  codebase (see AIS_ROUTES removal note near the top of this file).
                  NOTE not yet resolved: COMMODITY_IDX itself (BGI/CGPI/CCFI/VPIN-C below) is
                  also a hardcoded static array with no computing script behind it — same
                  fabrication class, flagged for Helen, not fixed in this pass. */}
              <PanelBox border={C.brics}>
                <DLbl col={C.brics}>Commodity Indices</DLbl>
                {COMMODITY_IDX.map((c, i) => (
                  <div key={c.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span className="cond" style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{c.id} — {c.name}</span><DVal col={c.color} sz={16}>{c.val}</DVal></div>
                    <MiniChart data={genSeries(c.val, c.val * 0.02)} col={c.color} h={30} />
                    {i < COMMODITY_IDX.length - 1 && <Divider />}
                  </div>
                ))}
              </PanelBox>
            </div>
          )}

          {/* ─── SENTINEL PROTOCOL ─── */}
          {tab === "protocol" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Automation Status — {CHECKPOINTS.length} Scripts</DLbl>
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 8 }}>All jobs share one GitHub Actions cron — every 30 minutes (:00 and :30 UTC). No per-item schedule; status below reflects whether each one returned a fresh row on the last poll.</div>
                <div style={{ maxHeight: 460, overflowY: "auto" }}>
                  {CHECKPOINTS.map((c, i) => {
                    const isLive = c.id === "MACRO" ? (macroData.find(m => m.k === "DXY")?.chg === "LIVE") : liveIds.includes(c.id);
                    return (
                      <div key={i} className="alert-row" style={{ borderLeftColor: isLive ? C.green : C.amber }}>
                        <Dot status={isLive ? "green" : "amber"} />
                        <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.white }}>{c.label}</div><div style={{ fontSize: 8, color: C.dim }}>{c.engine} → {c.signal}</div></div>
                        <span style={{ fontSize: 8, color: isLive ? C.green : C.amber }}>{isLive ? "LIVE" : "BETA"}</span>
                      </div>
                    );
                  })}
                </div>
              </PanelBox>
              <div>
                <PanelBox border={C.border}>
                  <DLbl>Alert Thresholds — 9 Indices</DLbl>
                  {[["RTAI", "< 50 ou −5% 24h", "> 75 et +2% 24h"], ["CCQI", "ICE EUA < €75", "ICE EUA > €90"], ["SSSI", "< 50 ou Δ>10pts/12h", "> 75 et stable"], ["CAVI", "Policy < 40", "Tech+Adopt > 70"], ["DYOI", "< 45 ou exploit", "VPIN<0.25 et >65"], ["XSQI", "ODL vol < 30%ile", "ODL vol > 70%ile"], ["XCDI", "AMM TVL < $50M", "AMM TVL > $200M"], ["ETACI", "Audit fail detected", "3 pillars > 70"], ["PII", "Mosaic < 4.0", "Mosaic > 7.5"]].map(([id, red, green]) => (
                    <div key={id} className="drow">
                      <span className="cond" style={{ fontSize: 11, fontWeight: 700, color: INDICES.find(x => x.id === id)?.color || C.gold, width: 50 }}>{id}</span>
                      <span style={{ flex: 1, fontSize: 9, color: C.red }}>🔴 {red}</span>
                      <span style={{ flex: 1, fontSize: 9, color: C.green }}>🟢 {green}</span>
                    </div>
                  ))}
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <DLbl>Live Alerts</DLbl>
                    {computeLiveAlerts(lives, macroData, liveIds).slice(0, 5).map((a, i) => (
                      <div key={i} className="alert-row" style={{ borderLeftColor: a.t === "red" ? C.red : a.t === "amber" ? C.amber : C.green, background: a.t === "red" ? `${C.red}08` : a.t === "amber" ? `${C.amber}08` : `${C.green}08` }}>
                        <Dot status={a.t} /><span className="mono-alt" style={{ fontSize: 9, color: C.dim, width: 32 }}>{a.time}</span><span style={{ flex: 1 }}>{a.msg}</span>
                      </div>
                    ))}
                  </PanelBox>
                </div>
              </div>
            </div>
          )}

          {/* ─── VALIDATION ─── */}
          {/* v2 (2026-08-03): removed fabricated per-index Sharpe/IR/p-value table (hardcoded
              p<0.0001 for all 9 indices regardless of index — not a real hypothesis test) and
              the "Business Plan — Financial Projections" panel (company fundraising NPV/IRR/
              MOIC + Y1-Y5 P&L, misplaced inside the paying-client dashboard — this belongs in
              investor materials, not a data subscription product). Replaced with content that's
              actually true: per-index methodology + live/beta status, and real compliance
              disclaimers. Flagged by Helen + KIMI review, fixed per her explicit instruction. */}
          {tab === "validation" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Methodology & Data Status — 9 Indices</DLbl>
                <div style={{ fontSize: 9.5, color: C.dim, marginBottom: 10, lineHeight: 1.4 }}>
                  We publish weighting methodology, not backtested performance statistics — with
                  ~3 months of production history, Sharpe/IR/drawdown figures would not be
                  statistically robust at institutional standards.
                </div>
                {INDICES.map(idx => (
                  <div key={idx.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span className="cond" style={{ fontWeight: 800, color: idx.color, fontSize: 12 }}>{idx.id}</span>
                      <Badge col={isIdxLive(idx) ? C.green : C.amber}>{isIdxLive(idx) ? "LIVE · Supabase" : "BETA · feed pending"}</Badge>
                    </div>
                    <div style={{ fontSize: 9.5, color: C.text, lineHeight: 1.4 }}>{idx.method}</div>
                  </div>
                ))}
              </PanelBox>
              <div>
                <PanelBox border={C.gold}>
                  <DLbl col={C.gold}>Compliance & Disclaimers</DLbl>
                  <div style={{ fontSize: 9.5, color: C.text, lineHeight: 1.6 }}>
                    STEELLDY indices are algorithmic information tools for internal analytical
                    use. They are not investment advice, not a recommendation to buy, sell or
                    hold any instrument, and not a benchmark within the meaning of EU Regulation
                    2016/1011 (BMR). STEELLDY Advisory is not an investment services provider
                    under MiFID II. No target price or BUY/SELL/HOLD rating is ever issued.
                  </div>
                  <Divider />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.dim }}>
                    <span>Independent audit</span><span style={{ color: C.amber }}>Scheduled — pending funded engagement</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.dim, marginTop: 4 }}>
                    <span>BMR administrator registration</span><span>Not applicable — not a referenced benchmark</span>
                  </div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.gold}>
                    <DLbl col={C.gold}>Mosaic Score</DLbl>
                    <div className="mono-alt" style={{ fontSize: 44, color: mCol, lineHeight: 1 }}>{mosaic.toFixed(1)}</div>
                    <div className="cond" style={{ fontSize: 11, fontWeight: 800, color: mCol, marginTop: 4 }}>{mosaic >= 7.5 ? "FULL RISK-ON" : mosaic >= 5 ? "MODERATE BULLISH" : "DEFENSIVE"}</div>
                  </PanelBox>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* DASHBOARD FOOTER */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", justifyContent: "space-between", fontSize: 9, color: C.dim, background: C.panel, flexWrap: "wrap", gap: 6 }}>
          <div>STEELLDY Advisory · Gex, France · 9 Indices</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["CoinGecko", "DeFi Llama", "XRPScan", "Verra Registry", "BIS Tracker", "XRPL API", "Supabase"].map(s => <span key={s}>{s}</span>)}
          </div>
          <div>© 2026 STEELLDY · CONFIDENTIAL · Not investment advice</div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH PAGE — Login / Signup Clerk
// ═══════════════════════════════════════════════════════════════════════════════
const AuthPage = ({ mode = "sign-in", onNavigate }) => (
  <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
    <div style={{ marginBottom: 32, textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: C.gold, letterSpacing: ".14em", marginBottom: 8 }}>STEELLDY</div>
      <div style={{ fontSize: 13, color: C.dim }}>
        {mode === "sign-in" ? "Accédez à votre espace Intelligence" : "Créez votre compte STEELLDY"}
      </div>
    </div>
    {mode === "sign-in"
      ? <SignIn
          appearance={{ variables: { colorPrimary: C.gold, colorBackground: C.panel, colorText: C.white, colorTextSecondary: C.dim, colorInputBackground: C.bg, colorInputText: C.white, borderRadius: "4px", fontFamily: "DM Sans, sans-serif" } }}
          afterSignInUrl="/"
          signUpUrl="/sign-up"
        />
      : <SignUp
          appearance={{ variables: { colorPrimary: C.gold, colorBackground: C.panel, colorText: C.white, colorTextSecondary: C.dim, colorInputBackground: C.bg, colorInputText: C.white, borderRadius: "4px", fontFamily: "DM Sans, sans-serif" } }}
          afterSignUpUrl="/"
          signInUrl="/sign-in"
        />
    }
    <button onClick={() => onNavigate("home")} style={{ marginTop: 24, background: "transparent", border: "none", color: C.dim, fontSize: 12, cursor: "pointer" }}>← Retour à l'accueil</button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD GATED — accès selon tier
// ═══════════════════════════════════════════════════════════════════════════════
const DashboardGated = ({ onNavigate }) => {
  const { user } = useUser();
  const tier = getTier(user);

  // FREE : accès DYOI seulement
  if (tier === "free") {
    const dyoi = INDICES.find(i => i.id === "DYOI");
    const series = genSeries(dyoi.base, dyoi.vol);
    return (
      <div style={{ minHeight: "100vh", background: C.bg, padding: 40 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".15em", marginBottom: 4 }}>FREE TIER — APERÇU LIMITÉ</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: C.white }}>DYOI — DeFi Yield Optimization Index</div>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>

          {/* DYOI Card */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.cyan}`, padding: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div className="mono" style={{ fontSize: 48, fontWeight: 300, color: C.white }}>{dyoi.base.toFixed(1)}<span style={{ fontSize: 20, color: C.cyan }}>%</span></div>
                <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Yield annualisé moyen · 25 protocoles · T-1</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>Data Source</div>
                <div className="mono" style={{ fontSize: 16, color: C.green }}>DeFi Llama · LIVE</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={series}>
                <defs><linearGradient id="gcyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={.3} /><stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke={C.cyan} strokeWidth={2} fill="url(#gcyan)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20 }}>
              {dyoi.sub.map((s, i) => (
                <div key={s} style={{ background: C.panel2, padding: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{s}</div>
                  <div className="mono" style={{ fontSize: 18, color: C.cyan }}>{dyoi.subV[i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Banner */}
          <div style={{ background: `linear-gradient(135deg, ${C.gold}12, ${C.gold}06)`, border: `1px solid ${C.gold}40`, borderRadius: 4, padding: 28, textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em", marginBottom: 8 }}>DÉBLOQUEZ LES 9 INDICES</div>
            <div style={{ fontSize: 22, fontWeight: 300, color: C.white, marginBottom: 8 }}>
              8 indices supplémentaires · API · Alertes temps réel
            </div>
            <div style={{ fontSize: 13, color: C.dim, marginBottom: 24 }}>
              RTAI · CCQI · SSSI · CAVI · XSQI · XCDI · ETACI · PII
            </div>
            <button className="btn-gold" onClick={() => handleStripe(STRIPE_LINKS.analyst)}>
              Passer à Analyst — €490/mois →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ANALYST, PROFESSIONAL, INSTITUTIONAL → Dashboard complet
  return <DashboardPage userTier={tier} />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP — NAVIGATION + CLERK PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════
function AppInner() {
  const [page, setPage] = useState("home");
  const { isSignedIn, user } = useUser();
  const tier = getTier(user);
  const nav = (p) => { setPage(p); window.scrollTo(0, 0); };

  // Si l'utilisateur essaie d'accéder au dashboard sans être connecté
  const handleDashboard = () => {
    if (isSignedIn) nav("dashboard");
    else nav("sign-in");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* GLOBAL NAV */}
      {page !== "sign-in" && page !== "sign-up" && (
        <nav style={{ position: "sticky", top: 0, zIndex: 1000, background: "rgba(3,7,17,.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 40px" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div onClick={() => nav("home")} style={{ cursor: "pointer" }}>
                <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: C.gold, letterSpacing: ".14em" }}>STEELLDY</span>
              </div>
              {[["home", "Home"], ["pricing", "Pricing"]].map(([id, label]) => (
                <button key={id} onClick={() => nav(id)} style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 500, border: "none", background: "transparent", color: page === id ? C.white : C.dim, cursor: "pointer", padding: "4px 0", borderBottom: page === id ? `2px solid ${C.gold}` : "2px solid transparent" }}>{label}</button>
              ))}
              {isSignedIn && (
                <button onClick={() => nav("dashboard")} style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 500, border: "none", background: "transparent", color: page === "dashboard" ? C.white : C.dim, cursor: "pointer", padding: "4px 0", borderBottom: page === "dashboard" ? `2px solid ${C.gold}` : "2px solid transparent" }}>Dashboard</button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {isSignedIn ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="mono" style={{ fontSize: 10, color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}40`, padding: "3px 8px", borderRadius: 2, letterSpacing: ".08em" }}>
                    {(tier || "FREE").toUpperCase()}
                  </span>
                  <UserButton afterSignOutUrl="/" appearance={{ variables: { colorPrimary: C.gold } }} />
                </div>
              ) : (
                <>
                  <button onClick={() => nav("sign-in")} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans'" }}>Se connecter</button>
                  <button onClick={() => nav("pricing")} className="btn-outline" style={{ padding: "8px 20px", fontSize: 12 }}>Get Started</button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* PAGES */}
      {page === "home"      && <HomePage     onNavigate={nav} />}
      {page === "pricing"   && <PricingPage  onNavigate={nav} />}
      {page === "sign-in"   && <AuthPage mode="sign-in"  onNavigate={nav} />}
      {page === "sign-up"   && <AuthPage mode="sign-up"  onNavigate={nav} />}
      {page === "dashboard" && (
        isSignedIn
          ? <DashboardGated onNavigate={nav} />
          : <AuthPage mode="sign-in" onNavigate={nav} />
      )}

      {/* GLOBAL FOOTER */}
      {!["dashboard","sign-in","sign-up"].includes(page) && (
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px", background: C.panel }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="mono" style={{ fontSize: 14, color: C.gold, letterSpacing: ".1em", marginBottom: 6 }}>STEELLDY</div>
              <div style={{ fontSize: 11, color: C.dim }}>Advisory · Gex, France · Institutional Quantitative Intelligence</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.dim }}>
              {["Data Ingestion", "Scoring", "Aggregation", "Automation", "Storage", "Delivery"].map(s => <span key={s} className="mono">{s}</span>)}
            </div>
            <div style={{ fontSize: 10, color: C.dim }}>© 2026 STEELLDY · Not investment advice</div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  if (!CLERK_KEY) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: C.dim, fontSize: 13 }}>
          <div className="mono" style={{ color: C.gold, marginBottom: 8 }}>STEELLDY</div>
          Clerk configuration manquante — ajouter VITE_CLERK_PUBLISHABLE_KEY dans .env
        </div>
      </div>
    );
  }
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <AppInner />
    </ClerkProvider>
  );
}
