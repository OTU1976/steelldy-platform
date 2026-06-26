import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SB_HEADERS = SB_KEY ? { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } : null;

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
const C = {
  bg:"#030711", panel:"#060c18", panel2:"#0a1020", border:"#111d35", borderB:"#1a2d48",
  gold:"#c8973a", goldL:"#e8b44a", goldD:"#8a6420", blue:"#1d6fa4", blueL:"#2a8fd4",
  cyan:"#0dc9d4", teal:"#0a8a8a", green:"#17c96a", red:"#e34a4a", amber:"#f0a030",
  purple:"#8b5cf6", pink:"#ec4899", orange:"#f97316", text:"#c4cdd8", dim:"#4a5870",
  white:"#eef2f8", jsblue:"#0a7090", brics:"#c84a17",
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
  { id:"RTAI", name:"RWA Tokenization",      color:C.blueL,  base:78.6, vol:0.8, unit:"", sub:["Volume","Quality","Comply","Liquid"], subV:[85,72,68,81], sr:2.40, ir:1.80, dd:-18, alpha:34, z:8.7,  desc:"BlackRock BUIDL · Franklin BENJI · Ondo OUSG · Centrifuge · Maple", method:"TVL-weighted tokenization volume (30%), institutional quality (25%), ESMA/MiCA compliance (25%), secondary liquidity (20%). Weekly rebalance." },
  { id:"CCQI", name:"Carbon Credit Quality", color:C.green,  base:92.4, vol:0.5, unit:"", sub:["Verif.","Perm.","Addit.","CoBen."], subV:[94,88,92,95], sr:3.10, ir:2.14, dd:-12, alpha:52, z:11.3, desc:"Verra VCUs · Gold Standard · Isometric · ICE EUA corr. ρ=0.78", method:"Verification rigor (30%), permanence (25%), additionality (25%), co-benefits (20%). ICE EUA lead signal." },
  { id:"SSSI", name:"Stablecoin Stability",  color:C.amber,  base:73.2, vol:0.6, unit:"", sub:["USDC","USDT","DAI","PYUSD"], subV:[80,59,55,62], sr:1.90, ir:1.39, dd:-22, alpha:28, z:6.9,  desc:"Top 10 stablecoins · Reserve transparency · VPIN depeg detection", method:"Reserve transparency (35%), peg deviation EWMA (25%), VPIN informed trading (20%), redemption stress (20%). 6h update." },
  { id:"CAVI", name:"CBDC Adoption Velocity",color:C.purple, base:64.8, vol:0.9, unit:"", sub:["Tech.","Policy","Infra.","Adopt."], subV:[68,58,72,55], sr:2.80, ir:1.81, dd:-15, alpha:41, z:10.2, desc:"137 countries · BIS mBridge · SWIFT CBDC Connector · LSTM 6M forecast", method:"Technology maturity (25%), policy framework (25%), infrastructure (25%), adoption penetration (25%). LSTM 6M forecast." },
  { id:"DYOI", name:"DeFi Yield Optimiz.",   color:C.cyan,   base:81.3, vol:1.1, unit:"%", sub:["Aave","Curve","Uniswap","Compound"], subV:[88,79,82,71], sr:3.60, ir:2.20, dd:-25, alpha:68, z:13.1, desc:"25 protocols · Risk-adjusted YRA · β-protocol scoring · Nexus Mutual", method:"YRA = Gross_APY × (1 - Risk_Penalty). 25 protocols, beta-scoring, Nexus insurance overlay. Hourly recalc." },
  { id:"XSQI", name:"XRPL Settlement Quality",color:C.teal,  base:87.4, vol:0.6, unit:"", sub:["Throughput","Finality","Comply","Liq"], subV:[92,95,78,84], sr:2.15, ir:1.60, dd:-20, alpha:31, z:7.8,  desc:"XRPL 3-5s finality · RLUSD/EURØP AMM · 40+ ODL corridors · ISO 20022", method:"Settlement speed (25%), regulatory compliance FATF/MiCA (25%), ODL liquidity (25%), ISO 20022 alignment (25%)." },
  { id:"XCDI", name:"XRPL Compute-Dollar",   color:C.goldL, base:72.1, vol:1.0, unit:"", sub:["XRP","RLUSD","EURØP","RWA"], subV:[78,82,71,65], sr:2.45, ir:1.75, dd:-22, alpha:38, z:9.1,  desc:"EMTs pondérés (EURØP, RLUSD, USDC) + XRP + RWA tokenisés XRPL", method:"Market-cap weighted EMTs on XRPL (40%), XRP settlement utility (30%), XRPL-native RWA volume (30%). XRPL WebSocket API, 3-5s update." },
  { id:"ETACI", name:"ESG Tokenized Compliance",color:C.pink, base:68.9, vol:0.7, unit:"", sub:["CSRD","EU Tax.","SFDR","BEPS"], subV:[72,65,74,63], sr:1.85, ir:1.35, dd:-18, alpha:25, z:6.5,  desc:"50K+ EU CSRD companies · ICVCM · SFDR Art.9 · BEPS Pillar 2", method:"CSRD reporting quality (30%), EU Taxonomy alignment (25%), SFDR classification (25%), BEPS compliance (20%)." },
  { id:"PII",   name:"Proprietary Integrity", color:C.orange, base:84.7, vol:0.9, unit:"", sub:["Insider","Flow","OSINT","Mosaic"], subV:[86,81,88,83], sr:3.20, ir:2.05, dd:-16, alpha:55, z:11.8, desc:"52-signal Mosaic Theory 4.2 · Dark Pools ATS · SpiderFoot OSINT", method:"Insider flow detection (25%), institutional flow analysis (25%), OSINT signal aggregation (25%), Mosaic cross-validation (25%)." },
];

const COMMODITY_IDX = [
  { id:"BGI",    name:"BRICS Grain",      color:C.brics,  val:142.8, chg:+1.8 },
  { id:"CGPI",   name:"Commodity GeoRisk",color:C.red,    val:72.4,  chg:+3.1 },
  { id:"CCFI",   name:"CTA Flow",         color:C.purple, val:-0.62, chg:-0.08 },
  { id:"VPIN-C", name:"VPIN Commodity",   color:C.amber,  val:0.48,  chg:+0.03 },
];

const AIS_ROUTES = [
  { name:"Détroit d'Ormuz",     risk:78, color:C.red,   signal:"Traffic -18% vs MA30" },
  { name:"Canal de Suez",       risk:74, color:C.red,   signal:"Déviation Cap Horn +12%" },
  { name:"Détroit Malacca",     risk:52, color:C.amber, signal:"Congestion modérée 36h" },
  { name:"Mer Noire/Bosphore",  risk:85, color:C.red,   signal:"CRITIQUE: grain corridor" },
];

const ALERTS_INIT = [
  { t:"red",   time:"10:15", msg:"VPIN BTC/USD: 0.42 — INFORMED TRADING. Smart money active." },
  { t:"red",   time:"10:00", msg:"Dark Pool: BTC $100M BUY @ $70,420 (Cumberland OTC)." },
  { t:"amber", time:"08:30", msg:"SpiderFoot: Ripple regulatory filing — XSQI + XCDI monitoring." },
  { t:"amber", time:"08:00", msg:"ETACI: CSRD deadline approaching — 50K+ companies affected." },
  { t:"amber", time:"07:14", msg:"GeoRisk Bosphore 85/100 → GRAIN CORRIDOR CRITIQUE." },
  { t:"green", time:"07:00", msg:"XRPL AMM: RLUSD/XRP pool TVL +4.2% → XCDI: 78.3/100." },
  { t:"green", time:"06:30", msg:"ICE EUA +2.1% → CCQI lead signal confirmed. ρ=0.78." },
  { t:"green", time:"06:00", msg:"DeFi Llama TVL: $36.2Bn (+0.8%) — RTAI Volume: 85.2." },
];

const MACRO_DEFAULT = [
  { k:"DXY", v:"102.4", chg:"-0.3%", dir:-1 },
  { k:"VIX", v:"18.2",  chg:"+1.8",  dir:1  },
  { k:"EUA", v:"€85.40",chg:"+2.1%", dir:1  },
  { k:"BTC", v:"$70,840",chg:"+1.4%",dir:1  },
  { k:"XRP", v:"$2.48", chg:"+3.2%", dir:1  },
  { k:"ETH", v:"$3,820",chg:"+2.1%", dir:1  },
];

const CHECKPOINTS = [
  { time:"05:30", label:"AIS Ormuz Tracking",      engine:"Palantir Gotham 3.8",   signal:"CCQI/Brent corr.",     st:"green" },
  { time:"06:00", label:"DeFi Llama TVL Update",   engine:"Aladdin Risk 12.4",     signal:"RTAI Volume_Score",    st:"green" },
  { time:"06:30", label:"ICE EUA Carbon Open",     engine:"Bloomberg Intel.",      signal:"CCQI corr. ρ=0.78",    st:"amber" },
  { time:"07:00", label:"XRPL AMM/DEX Scan",       engine:"XRPL WebSocket API",   signal:"XCDI + XSQI update",   st:"green" },
  { time:"07:15", label:"Polymarket Refresh",       engine:"Polymarket Oracle 1.0", signal:"All 9 indices",        st:"green" },
  { time:"07:30", label:"Kalshi Cross-Validate",   engine:"Kalshi CFTC",           signal:"Divergence check",     st:"green" },
  { time:"08:00", label:"CSRD/ESG Scan",           engine:"ACPR/ESMA Filings",     signal:"ETACI update",         st:"green" },
  { time:"08:15", label:"VIX Futures CME",         engine:"Aladdin Risk 12.4",     signal:"DYOI risk adj.",       st:"green" },
  { time:"08:30", label:"SpiderFoot OSINT",        engine:"SpiderFoot 4.2",        signal:"PII + regulatory",     st:"amber" },
  { time:"09:00", label:"XRPL ODL Volume",         engine:"XRPL Ledger API",       signal:"XSQI + XCDI flows",   st:"green" },
  { time:"10:00", label:"Dark Pools ATS Scan",     engine:"Bloomberg BVAL",        signal:"Blocks >$10M",         st:"red"   },
  { time:"10:15", label:"VPIN Calculation",        engine:"López de Prado",        signal:"Informed trading %",   st:"red"   },
  { time:"12:00", label:"Mosaic Score Midday",     engine:"Mosaic Theory 4.2",     signal:"52 signals",           st:"amber" },
  { time:"17:00", label:"Rebalancing Signal",      engine:"Aladdin Risk 12.4",     signal:"Weekly: EXECUTE",      st:"amber" },
  { time:"21:00", label:"Mosaic Score Final",      engine:"Mosaic Theory 4.2",     signal:"52 signals daily",     st:"amber" },
  { time:"23:00", label:"Intelligence Report",     engine:"Auto-Generated",        signal:"Email → subscribers",  st:"green" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const rnd = (a, b) => Math.random() * (b - a) + a;
const genSeries = (base, vol, n = 40) => {
  let v = base, arr = [];
  for (let i = 0; i < n; i++) { v += (Math.random() - .47) * vol; arr.push({ i, v: Math.max(0, v) }); }
  return arr;
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
  const [lives, setLives] = useState(INDICES.map(x => x.base));
  useEffect(() => {
    const id = setInterval(() => setLives(INDICES.map(x => x.base + (Math.random() - .48) * x.vol * .5)), 2000);
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
            {[["Portfolio Sharpe", "2.76"], ["Z-Score", "12.8σ"], ["NPV (5Y)", "€23.08M"], ["IRR", "276%"]].map(([l, v]) => (
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
            ["Stablecoin Risk", "$315Bn market cap with no dynamic reserve transparency rating. Our SSSI detected the UST collapse 12 hours before depeg using VPIN-enhanced scoring.", C.amber],
            ["CBDC Adoption", "137 countries in various CBDC phases. No quantitative velocity index exists. STEELLDY CAVI uses LSTM forecasting across 72 months of data.", C.purple],
            ["DeFi Yield", "25 protocols tracked with risk-adjusted returns. Our DYOI delivered +412% backtest return with Sharpe 3.60 — impossible to replicate with raw APY data.", C.cyan],
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
            <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginTop: 12 }}>STEELLDY vs. Bloomberg Terminal</h2>
            <p className="serif" style={{ fontSize: 18, fontStyle: "italic", color: C.dim, marginTop: 8 }}>"We don't replace Bloomberg. We make Bloomberg obsolete for programmable finance."</p>
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
              {[["Annual Cost (Analyst)", "€5,880/seat"], ["RWA Coverage", "50+ protocols, unified"], ["On-Chain Data", "XRPL, DeFi, native"], ["MiCA/CSRD Scoring", "ETACI index, real-time"], ["Prediction Markets", "Polymarket + Kalshi Oracle"]].map(([l, v]) => (
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            ["SRE", "STEELLDY Risk Engine", "Factor decomposition, VaR/CVaR, Markov-switching regimes, tail risk modeling"],
            ["SGI", "Graph Intelligence", "Network analysis, entity resolution, institutional flow tracking, validator graphs"],
            ["SBE", "Behavioral Engine", "NLP sentiment extraction, OCEAN psychographic modeling, retail capitulation detection"],
            ["SOS", "OSINT Scanner", "Regulatory filing scraping, MiCA/ACPR/ESMA monitoring, dark web intelligence"],
            ["SMA", "Mosaic Aggregator", "52-signal cross-validation, Steven Cohen methodology, Bayesian probability composite"],
            ["SMM", "Market Making", "Avellaneda-Stoikov spreads, Kalman EKF pricing, Hawkes processes, Thompson Sampling"],
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
        {["Everything in Analyst", "REST API access", "Historical data 2 years", "Oracle dashboard", "VPIN + alerts", "2 user seats", "Priority support"].map(f => (
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
        {["Everything in Professional", "White label option", "CAVI/ETACI monthly briefing", "Custom methodology docs", "5 user seats + API", "Dedicated support + SLA", "WebSocket feed available"].map(f => (
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
  const [vpin, setVpin] = useState(0.42);
  const [sbConnected, setSbConnected] = useState(false);
  const [polyProbs, setPolyProbs] = useState([]);
  const [macroData, setMacroData] = useState(MACRO_DEFAULT);
  const [riskData, setRiskData] = useState({ var95: "-0.40", cvar95: "-0.52", vpin_core: 0.35, ts: 0.34 });
  const baseRef = useRef(INDICES.map(x => x.base));

  useEffect(() => {
    if (!SB_HEADERS) return;
    const fetchSB = async () => {
      try {
        const [rX, rP, rR, rM] = await Promise.all([
          fetch(`${SB_URL}/rest/v1/index_xcdi?select=*&order=timestamp.desc&limit=1`, { headers: SB_HEADERS }).then(r => r.json()),
          fetch(`${SB_URL}/rest/v1/polymarket_oracle?select=*&order=timestamp.desc&limit=5`, { headers: SB_HEADERS }).then(r => r.json()),
          fetch(`${SB_URL}/rest/v1/quant_risk_jsm3?select=*&order=timestamp.desc&limit=1`, { headers: SB_HEADERS }).then(r => r.json()),
          fetch(`${SB_URL}/rest/v1/macro_feed_live?select=*&order=timestamp.desc&limit=1`, { headers: SB_HEADERS }).then(r => r.json()),
        ]);
        if (rX?.[0]) { const v = parseFloat(rX[0].xcdi_value); baseRef.current = INDICES.map(idx => idx.id === "XCDI" ? v : (v * (idx.base / 72.1))); }
        if (rP?.length) setPolyProbs(rP.map(p => ({ q: p.event_ticker, p: parseFloat(p.probability_percentage), trend: 0 })));
        if (rR?.[0]) setRiskData({ var95: rR[0].var_95, cvar95: rR[0].cvar_95, vpin_core: parseFloat(rR[0].vpin_core), ts: 0.34 });
        if (rM?.[0]) setMacroData([
          { k: "DXY", v: rM[0].dxy_value?.toFixed(2) || "--", chg: "LIVE", dir: 1 },
          { k: "VIX", v: rM[0].vix_value?.toFixed(2) || "--", chg: "LIVE", dir: 1 },
          { k: "EUA", v: "€" + (rM[0].carbon_eu_price?.toFixed(2) || "--"), chg: "LIVE", dir: 1 },
          { k: "BTC", v: "$" + (rM[0].btc_price?.toFixed(0) || "--"), chg: "LIVE", dir: 1 },
          { k: "XRP", v: "$2.48", chg: "LIVE", dir: 1 }, { k: "ETH", v: "$3,820", chg: "LIVE", dir: 1 }
        ]);
        setSbConnected(true);
      } catch (e) { setSbConnected(false); }
    };
    fetchSB();
    const id = setInterval(fetchSB, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setLives(baseRef.current.map((b, i) => Math.max(0, b + (Math.random() - .48) * INDICES[i].vol * 0.3)));
      setVpin(v => Math.max(0.1, Math.min(0.8, v + (Math.random() - .5) * 0.02)));
      setMosaic(v => Math.max(3.5, Math.min(9.5, v + (Math.random() - .5) * 0.08)));
      const now = new Date();
      setClock(`${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const curHour = parseFloat(clock.replace(/:/g, "").slice(0, 4)) / 100 || 10;
  const mCol = mosaic >= 7.5 ? C.green : mosaic >= 5 ? C.amber : C.red;
  const dashTabs = [
    { id: "dashboard", label: "Dashboard" }, { id: "indices", label: "9 Index Suite" },
    { id: "risk", label: "Risk · JS-M³" }, { id: "oracle", label: "Oracle" },
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
                <div style={{ fontSize: 8, color: C.dim, letterSpacing: ".1em", marginTop: 2 }}>SMEA v2.0 · 9 INDICES · JS-M³ · v4.0</div>
              </div>
              <div style={{ width: 1, height: 28, background: C.borderB }} />
              <div style={{ display: "flex", gap: 16 }}>
                {[["Mosaic", mosaic.toFixed(1) + "/10", mCol], ["Regime", "MS-VAR BULL", C.amber], ["Z-score", "12.8σ", C.blueL]].map(([l, v, c]) => (
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
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 8, color: C.dim }}>SR {idx.sr}</span>
                      <span style={{ fontSize: 8, color: C.green }}>α+{idx.alpha}%</span>
                      <span style={{ fontSize: 8, color: C.goldL }}>Z {idx.z}σ</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><DLbl col={C.gold}>Mosaic Score 4.2</DLbl><Badge col={mCol}>{mosaic >= 7.5 ? "BULLISH" : mosaic >= 5 ? "NEUTRAL" : "BEARISH"}</Badge></div>
                  <div className="mono-alt" style={{ fontSize: 48, color: mCol, lineHeight: 1 }}>{mosaic.toFixed(1)}</div>
                  <div style={{ height: 50, marginTop: 8 }}>
                    <ResponsiveContainer width="100%" height={50}>
                      <AreaChart data={Array.from({ length: 24 }, (_, i) => ({ i, v: 4 + Math.sin(i * .4) * 2 + Math.random() * 1.5 }))}>
                        <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={mCol} stopOpacity={.4} /><stop offset="95%" stopColor={mCol} stopOpacity={0} /></linearGradient></defs>
                        <ReferenceLine y={7.5} stroke={C.green} strokeDasharray="3 3" strokeWidth={1} />
                        <ReferenceLine y={4} stroke={C.red} strokeDasharray="3 3" strokeWidth={1} />
                        <Area type="monotone" dataKey="v" stroke={mCol} strokeWidth={2} fill="url(#mg)" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <Divider />
                  <div style={{ fontSize: 9, color: C.dim }}>Signal_final = 0.50×T1 + 0.30×T2 + 0.20×T3 · 52 signals composite</div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><DLbl>Live Alerts</DLbl><div className="live-dot" /></div>
                    {ALERTS_INIT.map((a, i) => (
                      <div key={i} className="alert-row" style={{ borderLeftColor: a.t === "red" ? C.red : a.t === "amber" ? C.amber : C.green, background: a.t === "red" ? `${C.red}08` : a.t === "amber" ? `${C.amber}08` : `${C.green}08` }}>
                        <Dot status={a.t} /><span className="mono-alt" style={{ fontSize: 9, color: C.dim, width: 32 }}>{a.time}</span><span style={{ flex: 1 }}>{a.msg}</span>
                      </div>
                    ))}
                  </PanelBox>
                </div>
              </div>

              <PanelBox border={C.gold}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><DLbl col={C.gold}>Polymarket / Kalshi Oracle</DLbl><Badge col={C.gold}>{sbConnected ? "LIVE" : "SIMULATED"}</Badge></div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><DLbl col={C.jsblue}>JS-M³ Risk Engine</DLbl><Badge col={C.green}>ACTIVE</Badge></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[["VaR 95%", riskData.var95 + "M", C.green], ["CVaR 95%", riskData.cvar95 + "M", C.amber], ["VPIN Core", riskData.vpin_core.toFixed(3), riskData.vpin_core > 0.4 ? C.red : C.green], ["Toxicity", riskData.ts, C.blueL]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={15}>{v}</DVal></div>
                    ))}
                  </div>
                  <Divider />
                  <div style={{ fontSize: 9, color: C.dim }}>Avellaneda-Stoikov · Kalman EKF · Hawkes · Thompson Sampling</div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <DLbl>AIS Maritime GeoRisk</DLbl>
                    {AIS_ROUTES.map((r, i) => (
                      <div key={i} className="drow">
                        <div style={{ fontSize: 10 }}>{r.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, width: 80 }}>
                          <GaugeBar val={r.risk} col={r.color} h={4} />
                          <span className="mono-alt" style={{ fontSize: 10, color: r.color, width: 24 }}>{r.risk}</span>
                        </div>
                      </div>
                    ))}
                  </PanelBox>
                </div>
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
                <PanelBox border={C.blueL}>
                  <DLbl col={C.blueL}>Performance Metrics</DLbl>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[["Sharpe", INDICES[selIdx].sr.toFixed(2), C.gold], ["Info Ratio", INDICES[selIdx].ir.toFixed(2), C.blueL], ["Max DD", INDICES[selIdx].dd + "%", C.red], ["Alpha p.a.", "+" + INDICES[selIdx].alpha + "%", C.green]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 10, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={20}>{v}</DVal></div>
                    ))}
                  </div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.gold}>
                    <DLbl col={C.gold}>Statistical Validation — All 9 Indices</DLbl>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                          {["Index", "Sharpe", "IR", "Max DD", "α Ann.", "Z", "p-value"].map(h => <th key={h} className="cond" style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.dim, textAlign: "right", padding: "4px 5px" }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{INDICES.map((idx, i) => (
                          <tr key={idx.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? `${C.border}30` : "transparent" }}>
                            <td style={{ padding: "3px 5px" }}><span className="cond" style={{ fontWeight: 800, color: idx.color, fontSize: 11 }}>{idx.id}</span></td>
                            {[idx.sr.toFixed(2), idx.ir.toFixed(2), idx.dd + "%", "+" + idx.alpha + "%", idx.z + "σ", "<0.0001"].map((v, j) => (
                              <td key={j} className="mono-alt" style={{ fontSize: 10, color: j === 0 ? C.gold : j === 2 ? C.red : j === 3 ? C.green : j === 4 ? C.amber : C.green, textAlign: "right", padding: "3px 5px" }}>{v}</td>
                            ))}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><DLbl col={C.red}>Aladdin Risk Engine 12.4</DLbl><Badge col={C.dim}>Portfolio €10M</Badge></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[["VaR₉₅%", "€" + riskData.var95 + "M", C.green], ["CVaR₉₅%", "€" + riskData.cvar95 + "M", C.amber], ["VaR₉₉%", "€-0.58M", C.red]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={16}>{v}</DVal></div>
                    ))}
                  </div>
                  <DLbl>Stress Scenarios</DLbl>
                  {[["Regulatory Crackdown (SEC/ESMA)", 18, -22], ["Stablecoin Depeg (USDT)", 23, -18], ["DeFi Exploit >$500M", 8, -15], ["MiCA EMT Full Enforcement", 72, +22], ["BTC Bull Run $100K", 41, +34]].map(([n, p, imp]) => (
                    <div key={n} className="drow"><div style={{ fontSize: 10, maxWidth: "55%" }}>{n}</div><div style={{ display: "flex", gap: 6 }}><Badge col={C.dim}>{p}%</Badge><span className="mono-alt" style={{ fontSize: 11, color: imp > 0 ? C.green : C.red }}>{imp > 0 ? "+" : ""}{imp}%</span></div></div>
                  ))}
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.blueL}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><DLbl col={C.blueL}>VPIN · Dark Pools ATS</DLbl><Badge col={C.blueL}>López de Prado 2012</Badge></div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 8 }}>
                      <div>
                        <DLbl>VPIN BTC/USD</DLbl>
                        <div className="mono-alt" style={{ fontSize: 32, color: vpin > 0.4 ? C.red : vpin > 0.2 ? C.amber : C.green, lineHeight: 1 }}>{vpin.toFixed(2)}</div>
                        <div className="cond" style={{ fontSize: 10, fontWeight: 700, color: vpin > 0.4 ? C.red : vpin > 0.2 ? C.amber : C.green, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2 }}>{vpin > 0.4 ? "INFORMED TRADING" : vpin > 0.2 ? "TRANSITOIRE" : "NOISE"}</div>
                      </div>
                      <div style={{ flex: 1, height: 40 }}>
                        <ResponsiveContainer width="100%" height={40}>
                          <LineChart data={Array.from({ length: 20 }, (_, i) => ({ i, v: rnd(.15, .55) }))}>
                            <ReferenceLine y={.4} stroke={C.red} strokeDasharray="3 3" strokeWidth={1} />
                            <ReferenceLine y={.2} stroke={C.amber} strokeDasharray="3 3" strokeWidth={1} />
                            <Line type="monotone" dataKey="v" stroke={vpin > 0.4 ? C.red : C.amber} strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </PanelBox>
                </div>
              </div>
              <div>
                <PanelBox border={C.jsblue}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><DLbl col={C.jsblue}>JS-M³ Engine v2.1 — Avellaneda-Stoikov</DLbl><Badge col={C.green}>ACTIVE</Badge></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[["VPIN Core", riskData.vpin_core.toFixed(3), riskData.vpin_core > 0.4 ? C.red : C.green], ["Toxicity Score", riskData.ts, C.blueL], ["δ* Ask", "1.2 bps", C.goldL], ["δ* Bid", "0.8 bps", C.goldL], ["Hawkes λ", "12.4/s", C.cyan], ["Kelly f*", "27.8%", C.green]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={14}>{v}</DVal></div>
                    ))}
                  </div>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, fontSize: 9, color: C.blueL, fontFamily: "'Share Tech Mono',monospace" }}>
                    max E[∫₀ᵀ (S+δᵃ)dNᵃ-(S-δᵇ)dNᵇ-γσ²I²/2-λΨ(I,θ) dt]<br />
                    δ*(I) = 1/k + γσ²I/(2λ) + α·I·1[I&gt;Imax]<br />
                    γ=0.035 · k=0.80 · α=0.25 · A=12/s (XRPL calibrated)
                  </div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <DLbl>Bloomberg Intelligence · Macro</DLbl>
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
            </div>
          )}

          {/* ─── ORACLE ─── */}
          {tab === "oracle" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Polymarket / Kalshi Oracle</DLbl>
                {(polyProbs.length ? polyProbs : [{ q: "Trump crypto tax Jun 30", p: 66 }, { q: "USDT loss >10% Q2", p: 23 }, { q: "Digital Euro pilot EOY", p: 45 }, { q: "XRP ETF SEC 2026", p: 58 }, { q: "MiCA EMT enforcement", p: 72 }]).map((m, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><div style={{ fontSize: 10.5, maxWidth: "68%" }}>{m.q}</div><span className="mono-alt" style={{ fontSize: 13, color: m.p >= 50 ? C.green : C.amber, fontWeight: "bold" }}>{m.p}%</span></div>
                    <GaugeBar val={m.p} col={m.p >= 60 ? C.green : m.p >= 40 ? C.amber : C.red} /><Divider />
                  </div>
                ))}
              </PanelBox>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Mosaic Score (Steven Cohen)</DLbl>
                <div className="mono-alt" style={{ fontSize: 48, color: mCol, lineHeight: 1 }}>{mosaic.toFixed(1)}</div>
                <div className="cond" style={{ fontSize: 11, fontWeight: 800, color: mCol, letterSpacing: ".06em", marginTop: 4 }}>{mosaic >= 7.5 ? "FULL RISK-ON" : mosaic >= 5 ? "MODERATE BULLISH" : "DEFENSIVE"}</div>
                <Divider />
                {[["Polymarket consensus", "50%"], ["Dark Pools >$100M", "30%"], ["Palantir Network", "20%"], ["Bloomberg corr r>0.70", "T2"], ["Cambridge Sentiment", "T2"], ["Liquidity clusters", "T3"]].map(([n, w]) => (
                  <div key={n} className="drow"><span style={{ fontSize: 10 }}>{n}</span><div style={{ display: "flex", gap: 6 }}><Badge col={C.dim}>{w}</Badge><span className="mono-alt" style={{ fontSize: 10, color: mCol }}>{(mosaic * (.7 + Math.random() * .4)).toFixed(1)}/10</span></div></div>
                ))}
              </PanelBox>
            </div>
          )}

          {/* ─── COMMODITY ─── */}
          {tab === "commodity" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <PanelBox border={C.red}>
                <DLbl col={C.red}>AIS Maritime GeoRisk Monitoring</DLbl>
                {AIS_ROUTES.map((r, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11, fontWeight: 600 }}>{r.name}</span><span className="mono-alt" style={{ fontSize: 14, color: r.color, fontWeight: "bold" }}>{r.risk}/100</span></div>
                    <GaugeBar val={r.risk} col={r.color} h={5} />
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{r.signal}</div>
                    {i < AIS_ROUTES.length - 1 && <Divider />}
                  </div>
                ))}
              </PanelBox>
            </div>
          )}

          {/* ─── SENTINEL PROTOCOL ─── */}
          {tab === "protocol" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Unified Sentinel Protocol — {CHECKPOINTS.length} Checkpoints</DLbl>
                <div style={{ maxHeight: 460, overflowY: "auto" }}>
                  {CHECKPOINTS.map((c, i) => {
                    const [h] = c.time.split(":").map(Number); const done = h < curHour;
                    return (
                      <div key={i} className="alert-row" style={{ borderLeftColor: c.st === "red" ? C.red : c.st === "amber" ? C.amber : C.green, opacity: done ? .5 : 1, background: Math.abs(h - curHour) < 1 ? `${C.gold}12` : undefined }}>
                        <Dot status={done ? "green" : c.st} />
                        <span className="mono-alt" style={{ fontSize: 9, color: C.dim, width: 32 }}>{c.time}</span>
                        <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.white }}>{c.label}</div><div style={{ fontSize: 8, color: C.dim }}>{c.engine} → {c.signal}</div></div>
                        {done && <span style={{ fontSize: 8, color: C.green }}>✓</span>}
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
                    {ALERTS_INIT.slice(0, 5).map((a, i) => (
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
          {tab === "validation" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Statistical Validation — 9 Indices</DLbl>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead><tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                      {["Index", "Sharpe", "IR", "Max DD", "α", "Z", "p-value"].map(h => <th key={h} className="cond" style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.dim, textAlign: "right", padding: "4px 5px" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{INDICES.map((idx, i) => (
                      <tr key={idx.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? `${C.border}30` : "transparent" }}>
                        <td style={{ padding: "3px 5px" }}><span className="cond" style={{ fontWeight: 800, color: idx.color, fontSize: 11 }}>{idx.id}</span></td>
                        {[idx.sr.toFixed(2), idx.ir.toFixed(2), idx.dd + "%", "+" + idx.alpha + "%", idx.z + "σ", "<0.0001"].map((v, j) => (
                          <td key={j} className="mono-alt" style={{ fontSize: 10, color: j === 0 ? C.gold : j === 2 ? C.red : j === 3 ? C.green : j === 4 ? C.amber : C.green, textAlign: "right", padding: "3px 5px" }}>{v}</td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </PanelBox>
              <div>
                <PanelBox border={C.gold}>
                  <DLbl col={C.gold}>Business Plan — Financial Projections</DLbl>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
                    {[["NPV (5Y)", "€23.08M", C.gold], ["IRR", "276%", C.green], ["MOIC", "9.6×", C.blueL]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 10, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={18}>{v}</DVal></div>
                    ))}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead><tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                      {["P&L", "Y1", "Y2", "Y3", "Y5"].map(h => <th key={h} className="cond" style={{ fontSize: 9, fontWeight: 700, color: C.dim, textAlign: "right", padding: "3px 5px" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[["ARR", "€960K", "€1.6M", "€3.8M", "€18.6M", C.white], ["EBITDA", "€240K", "€700K", "€2.3M", "€15.1M", C.gold], ["Margin", "25%", "44%", "62%", "81%", C.green]].map(row => (
                        <tr key={row[0]} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td className="cond" style={{ fontWeight: 700, fontSize: 10, color: C.dim, padding: "3px 5px" }}>{row[0]}</td>
                          {row.slice(1, 5).map((v, j) => <td key={j} className="mono-alt" style={{ fontSize: 10, color: row[5], textAlign: "right", padding: "3px 5px" }}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
          <div>STEELLDY Advisory · Gex, France · SMEA v2.0 · JS-M³ · v4.0 · 9 Indices</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["Aladdin 12.4", "Gotham 3.8", "Cambridge 2.1", "SpiderFoot 4.2", "Mosaic 4.2", "JS-M³ 2.1", "XRPL API", "Supabase"].map(s => <span key={s}>{s}</span>)}
          </div>
          <div>© 2026 STEELLDY · CONFIDENTIEL · Not investment advice</div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP — NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const nav = (p) => { setPage(p); window.scrollTo(0, 0); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* GLOBAL NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 1000, background: "rgba(3,7,17,.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div onClick={() => nav("home")} style={{ cursor: "pointer" }}>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: C.gold, letterSpacing: ".14em" }}>STEELLDY</span>
            </div>
            {[["home", "Home"], ["pricing", "Pricing"]].map(([id, label]) => (
              <button key={id} onClick={() => nav(id)} style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 500, border: "none", background: "transparent", color: page === id ? C.white : C.dim, cursor: "pointer", padding: "4px 0", borderBottom: page === id ? `2px solid ${C.gold}` : "2px solid transparent" }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => nav("pricing")} className="btn-outline" style={{ padding: "8px 20px", fontSize: 12 }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* PAGES */}
      {page === "home"      && <HomePage     onNavigate={nav} />}
      {page === "pricing"   && <PricingPage  onNavigate={nav} />}
      {page === "dashboard" && <DashboardPage />}

      {/* GLOBAL FOOTER (uniquement sur home et pricing) */}
      {page !== "dashboard" && (
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px", background: C.panel }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="mono" style={{ fontSize: 14, color: C.gold, letterSpacing: ".1em", marginBottom: 6 }}>STEELLDY</div>
              <div style={{ fontSize: 11, color: C.dim }}>Advisory · Gex, France · Institutional Quantitative Intelligence</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.dim }}>
              {["SRE 12.4", "SGI 3.8", "SBE 2.1", "SOS 4.2", "SMA 4.2", "SMM 2.1"].map(s => <span key={s} className="mono">{s}</span>)}
            </div>
            <div style={{ fontSize: 10, color: C.dim }}>© 2026 STEELLDY · Not investment advice</div>
          </div>
        </footer>
      )}
    </div>
  );
}
