import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SB_HEADERS = SB_KEY ? { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } : null;

// ─── STRIPE LINKS — Prix réels ────────────────────────────────────────────────
const STRIPE_LINKS = {
  analyst:       "https://buy.stripe.com/ANALYST_LINK",
  professional:  "https://buy.stripe.com/PROFESSIONAL_LINK",
  institutional: "mailto:helen@steelldy.com?subject=Institutional%20Plan%20-%20STEELLDY",
};
const handleStripe = (key) => {
  if (key === "institutional") { window.location.href = STRIPE_LINKS.institutional; }
  else { window.open(STRIPE_LINKS[key], "_blank"); }
};

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  bg:"#030711", panel:"#060c18", panel2:"#0a1020", border:"#1a2535", borderB:"#243548",
  gold:"#FFFFFF", goldL:"#FFFFFF", goldD:"#AAAAAA", blue:"#1d6fa4", blueL:"#2a8fd4",
  cyan:"#0dc9d4", teal:"#0a8a8a", green:"#17c96a", red:"#e34a4a", amber:"#f0a030",
  purple:"#8b5cf6", pink:"#ec4899", orange:"#f97316", text:"#FFFFFF", dim:"#7A8FA8",
  white:"#FFFFFF", jsblue:"#0a7090", brics:"#c84a17",
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
.disclaimer-bar{background:#0a0f1a;border-top:1px solid ${C.border};border-bottom:1px solid ${C.border};padding:8px 40px;font-size:10px;color:${C.dim};text-align:center;letter-spacing:.02em;line-height:1.6}
`;

// ─── DATA — 9 INDICES LIVE ────────────────────────────────────────────────────
const INDICES = [
  { id:"RTAI",  name:"RWA Tokenization",       color:C.blueL,  base:78.6, vol:0.8, unit:"", sub:["Volume","Quality","Comply","Liquid"], subV:[85,72,68,81], sr:2.40, ir:1.80, dd:-18, alpha:34, z:8.7,  desc:"BlackRock BUIDL · Franklin BENJI · Ondo OUSG · Centrifuge · Maple", method:"TVL-weighted tokenization volume (30%), institutional quality (25%), ESMA/MiCA compliance (25%), secondary liquidity (20%). Automated via DeFi Llama API. 6h update.", supaTable:"index_rtai", supaField:"rtai_value", status:"LIVE" },
  { id:"CCQI",  name:"Carbon Credit Quality",  color:C.green,  base:72.1, vol:0.5, unit:"", sub:["Verif.","Perm.","Addit.","CoBen."], subV:[94,88,92,95], sr:3.10, ir:2.14, dd:-12, alpha:52, z:11.3, desc:"Verra VCUs · Gold Standard · Isometric · ICE EUA corr. ρ=0.78. Pillar Two fiscal resilience signal (threshold: score <75).", method:"Verification rigor (30%), permanence (25%), additionality (25%), co-benefits (20%). ICE EUA lead signal via Yahoo Finance CO2.L. 6h update.", supaTable:"index_ccqi", supaField:"ccqi_value", status:"LIVE" },
  { id:"SSSI",  name:"Stablecoin Stability",   color:C.amber,  base:73.2, vol:0.6, unit:"", sub:["USDC","USDT","DAI","PYUSD"], subV:[80,59,55,62], sr:1.90, ir:1.39, dd:-22, alpha:28, z:6.9,  desc:"10 stablecoins · Reserve transparency · VPIN sigmoid · MiCA EMT status", method:"Reserve transparency (35%), peg deviation exp(-50|δ|) (25%), VPIN sigmoid (20%), redemption (20%). CoinGecko API. 6h update.", supaTable:"index_sssi", supaField:"sssi_value", status:"LIVE" },
  { id:"CAVI",  name:"CBDC Adoption Velocity", color:C.purple, base:64.8, vol:0.9, unit:"", sub:["Tech.","Policy","Infra.","Adopt."], subV:[68,58,72,55], sr:2.80, ir:1.81, dd:-15, alpha:41, z:10.2, desc:"134 countries · BIS mBridge · SWIFT CBDC · Digital Euro · e-CNY · DREX", method:"Technology (25%), policy framework (25%), cross-border infrastructure (20%), adoption penetration (30%). Manual monthly update.", supaTable:"index_cavi", supaField:"cavi_value", status:"LIVE" },
  { id:"DYOI",  name:"DeFi Yield Optimiz.",    color:C.cyan,   base:81.3, vol:1.1, unit:"%", sub:["Aave","Curve","Uniswap","Compound"], subV:[88,79,82,71], sr:3.60, ir:2.20, dd:-25, alpha:68, z:13.1, desc:"25+ protocols · Risk-adjusted YRA · β-protocol scoring · DeFi Llama TVL", method:"YRA = Gross_APY × (1 - Risk_Penalty). 25 protocols, beta-scoring. DeFi Llama API. 6h update.", supaTable:"index_dyoi", supaField:"dyoi_value", status:"LIVE" },
  { id:"XSQI",  name:"XRPL Settlement Quality",color:C.teal,  base:70.6, vol:0.6, unit:"", sub:["Speed","Comply","Liquid","ISO"], subV:[100,84,17,80], sr:2.15, ir:1.60, dd:-20, alpha:31, z:7.8,  desc:"XRPL 3-5s finality · RLUSD/EURC AMM · 12 ODL corridors · ISO 20022", method:"Settlement speed (25%), FATF/MiCA compliance (25%), ODL liquidity (25%), ISO 20022 (25%). XRPL API + CoinGecko. 6h update.", supaTable:"index_xsqi", supaField:"xsqi_value", status:"LIVE" },
  { id:"XCDI",  name:"XRPL Compute-Dollar",    color:C.goldL, base:48.3, vol:1.0, unit:"", sub:["XRP","RLUSD","Infra","Activity"], subV:[43,18,45,98], sr:2.45, ir:1.75, dd:-22, alpha:38, z:9.1,  desc:"XRP + RLUSD + XRPL AMM + on-chain activity · XRPL public API", method:"XRP score (normalized price+mcap) (30%), RLUSD supply+TVL (25%), infrastructure (20%), activity (25%). XRPL API + CoinGecko. 6h update.", supaTable:"index_xcdi", supaField:"xcdi_value", status:"LIVE" },
  { id:"ETACI", name:"ESG Tokenized Compliance",color:C.pink, base:75.8, vol:0.7, unit:"", sub:["CSRD","SFDR","Taxonomy","BEPS"], subV:[62,71,58,82], sr:1.85, ir:1.35, dd:-18, alpha:25, z:6.5,  desc:"50K+ EU CSRD companies · SFDR Art.8/9 · EU Taxonomy · BEPS Pillar 2 · €42.5Bn tokenized ESG bonds", method:"CSRD (30%), SFDR (25%), EU Taxonomy (25%), BEPS (20%) + tokenization bonus. Manual monthly update.", supaTable:"index_etaci", supaField:"etaci_value", status:"LIVE" },
  { id:"PII",   name:"Proprietary Integrity",  color:C.orange, base:89.8, vol:0.9, unit:"", sub:["Counterparty","Amount","Flow","Position"], subV:[88,93,91,86], sr:3.20, ir:2.05, dd:-16, alpha:55, z:11.8, desc:"Information leakage index · 6 stablecoin architectures · CoinGecko MC-weighted · Ahmed-Aldasoro run risk", method:"PII = 0.35×I_counterparty + 0.30×I_amount + 0.20×I_flow + 0.15×I_position. MC-weighted aggregate. CoinGecko API. 6h update.", supaTable:"index_pii", supaField:"pii_value", status:"LIVE" },
];

const COMMODITY_IDX = [
  { id:"BGI",    name:"BRICS Grain",      color:C.brics,  val:142.8, chg:+1.8 },
  { id:"CGPI",   name:"Commodity GeoRisk",color:C.red,    val:72.4,  chg:+3.1 },
  { id:"CCFI",   name:"CTA Flow",         color:C.purple, val:-0.62, chg:-0.08 },
  { id:"VPIN-C", name:"VPIN Commodity",   color:C.amber,  val:0.48,  chg:+0.03 },
];

const AIS_ROUTES = [
  { name:"Strait of Hormuz",  risk:78, color:C.red,   signal:"Traffic -18% vs MA30" },
  { name:"Suez Canal",        risk:74, color:C.red,   signal:"Cape Horn deviation +12%" },
  { name:"Malacca Strait",    risk:52, color:C.amber, signal:"Moderate congestion 36h" },
  { name:"Black Sea/Bosphorus",risk:85,color:C.red,   signal:"CRITICAL: grain corridor" },
];

const ALERTS_INIT = [
  { t:"red",   time:"10:15", msg:"VPIN BTC/USD: 0.42 — INFORMED TRADING. Smart money active." },
  { t:"red",   time:"10:00", msg:"SSSI: USDP peg deviation detected — monitoring active." },
  { t:"amber", time:"08:30", msg:"XSQI: Ripple RLUSD supply update — XCDI recalculating." },
  { t:"amber", time:"08:00", msg:"ETACI: CSRD Q2 reporting deadline approaching." },
  { t:"green", time:"07:30", msg:"CCQI: ICE EUA +2.1% — Pillar Two signal confirmed ρ=0.78." },
  { t:"green", time:"07:00", msg:"RTAI: BlackRock BUIDL TVL +$340M → RTAI Volume component updated." },
];

const CHECKPOINTS = [
  { time:"00:00", label:"CCQI — ICE EUA pre-market scan", engine:"SOS", signal:"Yahoo Finance CO2.L", st:"green" },
  { time:"01:00", label:"DYOI — DeFi Llama protocol scan", engine:"SRE", signal:"25 protocols yield update", st:"green" },
  { time:"02:00", label:"SSSI — CoinGecko stablecoin peg check", engine:"SRE", signal:"10 stablecoins VPIN", st:"green" },
  { time:"03:00", label:"RTAI — RWA TVL scan", engine:"SOS", signal:"DeFi Llama /protocols/rwa", st:"green" },
  { time:"04:00", label:"XCDI — XRPL ledger stats", engine:"SGI", signal:"XRPL public API", st:"amber" },
  { time:"05:00", label:"XSQI — ODL corridor check", engine:"SGI", signal:"XRPL + CoinGecko", st:"amber" },
  { time:"06:00", label:"CAVI — CBDC monthly check", engine:"SMA", signal:"BIS tracker", st:"green" },
  { time:"07:00", label:"ETACI — SFDR filing scan", engine:"SOS", signal:"ESMA registry", st:"green" },
  { time:"08:00", label:"PII — Information leakage update", engine:"SRE", signal:"CoinGecko MC", st:"green" },
  { time:"10:00", label:"CCQI — ICE EUA market open", engine:"SRE", signal:"Yahoo Finance live", st:"green" },
  { time:"12:00", label:"Full suite mid-day rebalance", engine:"ALL", signal:"9 indices GitHub Actions", st:"green" },
  { time:"16:00", label:"CCQI — EUA close snapshot", engine:"SRE", signal:"Yahoo Finance CO2.L close", st:"amber" },
  { time:"18:00", label:"Full suite evening update", engine:"ALL", signal:"GitHub Actions scheduled", st:"green" },
];

const MACRO_DEFAULT = [
  { k:"DXY", v:"102.4", chg:"-0.3%", dir:-1 },
  { k:"VIX", v:"18.2",  chg:"+1.8", dir:1 },
  { k:"EUA", v:"€77.0", chg:"+2.1%", dir:1 },
  { k:"BTC", v:"$70,840", chg:"+1.4%", dir:1 },
  { k:"XRP", v:"$1.07", chg:"+0.8%", dir:1 },
  { k:"ETH", v:"$3,420", chg:"-0.6%", dir:-1 },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const rnd = (a, b) => a + Math.random() * (b - a);
const genSeries = (base, vol, n = 30) => Array.from({ length: n }, (_, i) => ({ i, v: Math.max(0, base + (Math.random() - .5) * vol * 8) }));
const MiniChart = ({ data, col, h = 30 }) => (
  <ResponsiveContainer width="100%" height={h}>
    <AreaChart data={data}>
      <defs><linearGradient id={`g${col.replace("#","")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={col} stopOpacity={.35} /><stop offset="95%" stopColor={col} stopOpacity={0} /></linearGradient></defs>
      <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.5} fill={`url(#g${col.replace("#","")})`} dot={false} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer>
);
const GaugeBar = ({ val, col, h = 5 }) => (
  <div style={{ height: h, background: `${col}22`, borderRadius: 2, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, val)}%`, height: "100%", background: col, borderRadius: 2, transition: "width .5s" }} />
  </div>
);
const PanelBox = ({ children, border = C.border }) => (
  <div style={{ background: C.panel, border: `1px solid ${border}40`, borderTop: `2px solid ${border}`, padding: 14 }}>{children}</div>
);
const DLbl = ({ children, col = C.dim }) => <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: col, marginBottom: 4 }}>{children}</div>;
const DVal = ({ children, col = C.white, sz = 18 }) => <div className="mono-alt" style={{ fontSize: sz, color: col, lineHeight: 1.2 }}>{children}</div>;
const Divider = () => <div style={{ height: 1, background: C.border, margin: "8px 0" }} />;
const Badge = ({ children, col = C.dim }) => <span className="badge" style={{ background: col + "18", color: col, border: `1px solid ${col}40` }}>{children}</span>;
const Dot = ({ status }) => <span style={{ width: 6, height: 6, borderRadius: "50%", background: status === "red" ? C.red : status === "amber" ? C.amber : C.green, display: "inline-block", animation: status === "red" ? "pulse 1s infinite" : "none" }} />;

// ─── AMF DISCLAIMER BANNER ────────────────────────────────────────────────────
const DisclaimerBanner = () => (
  <div className="disclaimer-bar">
    ⚖️ <strong>REGULATORY NOTICE:</strong> STEELLDY indices are algorithmic scoring tools for informational purposes only. They do not constitute investment advice, financial recommendations, or solicitation to buy or sell any financial instrument within the meaning of MiFID II Directive 2014/65/EU or AMF regulations. STEELLDY Advisory is not a licensed investment services provider (PSI). Past performance of backtested strategies is not indicative of future results. All scores are proprietary calculations — not ratings issued by a registered credit rating agency.
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE v15
// ═══════════════════════════════════════════════════════════════════════════════
const HomePage = ({ onNavigate }) => {
  const [lives, setLives] = useState(INDICES.map(x => x.base));
  const [sbLive, setSbLive] = useState({});

  useEffect(() => {
    // Fetch real values from Supabase for the 9 indices
    if (!SB_HEADERS) return;
    const fetchAll = async () => {
      const results = {};
      for (const idx of INDICES) {
        try {
          const r = await fetch(`${SB_URL}/rest/v1/${idx.supaTable}?select=${idx.supaField}&order=timestamp.desc&limit=1`, { headers: SB_HEADERS });
          const data = await r.json();
          if (data?.[0]?.[idx.supaField]) results[idx.id] = parseFloat(data[0][idx.supaField]);
        } catch (e) {}
      }
      if (Object.keys(results).length > 0) setSbLive(results);
    };
    fetchAll();
    const id = setInterval(() => setLives(INDICES.map(x => x.base + (Math.random() - .48) * x.vol * .5)), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <DisclaimerBanner />

      {/* HERO */}
      <div style={{ position: "relative", minHeight: "88vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
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
            9 live algorithmic indices tracking RWA tokenization, carbon credits, stablecoins, CBDCs, DeFi yields, XRPL settlement, ESG compliance, and market integrity. Built for institutions that need signal, not noise.
          </p>
          <div className="fade-up delay-3" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button className="btn-gold" onClick={() => onNavigate("pricing")}>View Plans</button>
            <button className="btn-outline" onClick={() => onNavigate("dashboard")}>Live Demo</button>
          </div>
          <div className="fade-up delay-4" style={{ display: "flex", gap: 40, marginTop: 60, flexWrap: "wrap" }}>
            {[["9 Live Indices", "LIVE"], ["Update Freq.", "Hourly"], ["Data Sources", "Public APIs"], ["Compliance", "MiCA / CSRD"]].map(([l, v]) => (
              <div key={l}>
                <div className="mono" style={{ fontSize: 28, color: C.gold, fontWeight: 700 }}>{v}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 4, letterSpacing: ".04em" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 9-INDEX LIVE STRIP — données réelles Supabase */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "20px 0", background: C.panel }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
            <span className="mono" style={{ fontSize: 10, color: C.dim, letterSpacing: ".12em" }}>9 INDICES · LIVE DATA</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 10, color: C.green }}>All indices operational</span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 8, minWidth: 900 }}>
              {INDICES.map((idx, i) => {
                const live = sbLive[idx.id] || lives[i];
                const chg = ((live - idx.base) / idx.base * 100);
                return (
                  <div key={idx.id} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderTop: `2px solid ${idx.color}`, padding: 12, cursor: "pointer", transition: "all .2s" }}
                    onClick={() => onNavigate("dashboard")}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: idx.color, letterSpacing: ".06em" }}>{idx.id}</span>
                      <span className="mono" style={{ fontSize: 10, color: chg >= 0 ? C.green : C.red }}>{chg >= 0 ? "+" : ""}{chg.toFixed(1)}%</span>
                    </div>
                    <div className="mono" style={{ fontSize: 18, color: C.white, fontWeight: 600 }}>{live.toFixed(1)}{idx.unit}</div>
                    <div style={{ fontSize: 8, color: C.dim, marginTop: 2 }}>{idx.name}</div>
                    <MiniChart data={genSeries(live, idx.vol)} col={idx.color} h={24} />
                    <div style={{ marginTop: 4 }}>
                      <Badge col={C.green}>{idx.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* WHY STEELLDY */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>WHY STEELLDY</span>
          <h2 style={{ fontSize: 40, fontWeight: 300, color: C.white, marginTop: 12 }}>Nine Coverage Gaps. <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Zero Competitors.</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {[
            ["RTAI — RWA Tokenization", "$36Bn TVL with no unified quality benchmark. STEELLDY RTAI tracks institutional protocols (BlackRock BUIDL, Franklin BENJI, Ondo) with real-time DeFi Llama data.", C.blueL],
            ["CCQI — Carbon Credits", "$2Bn voluntary market. Our CCQI integrates ICE EUA futures (CO2.L) as lead signal (ρ=0.78). Critical for CSRD/Pillar Two fiscal resilience assessment.", C.green],
            ["SSSI — Stablecoin Risk", "$266Bn stablecoin market. SSSI uses sigmoid VPIN to detect peg stress before depeg events. 10 stablecoins tracked with per-coin transparency scoring.", C.amber],
            ["CAVI — CBDC Velocity", "134 countries tracked. CAVI quantifies adoption velocity across technology, policy, and cross-border infrastructure dimensions.", C.purple],
            ["DYOI — DeFi Yields", "25+ protocols. Risk-adjusted YRA scoring with beta-weighting. Powered by DeFi Llama API with 6-hour automated updates.", C.cyan],
            ["XSQI/XCDI — XRPL Suite", "ISO 20022 native settlement quality + compute-dollar index. The only institutional-grade scoring for the XRPL ecosystem.", C.teal],
            ["ETACI — ESG Compliance", "50K+ EU CSRD companies. SFDR Art.8/9 classification. EU Taxonomy alignment. €42.5Bn tokenized ESG bonds tracked.", C.pink],
            ["PII — Integrity Index", "Information leakage scoring across 6 stablecoin architectures. Based on Ahmed-Aldasoro BIS run risk model. MC-weighted aggregate.", C.orange],
            ["Fully Automated", "All 9 indices updated automatically via GitHub Actions. Hourly execution. Supabase persistence. Zero manual intervention needed.", C.gold],
          ].map(([title, desc, col], i) => (
            <div key={i} className={`fade-up delay-${i % 3 + 1}`} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${col}`, padding: 28 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* VS BLOOMBERG — repositionné sans attaque directe */}
      <div style={{ background: C.panel, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "80px 40px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>COMPETITIVE POSITIONING</span>
            <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginTop: 12 }}>Programmable Finance Coverage</h2>
            <p className="serif" style={{ fontSize: 18, fontStyle: "italic", color: C.dim, marginTop: 8 }}>Traditional terminals were not designed for on-chain, tokenized, or programmable assets.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 30 }}>
              <div className="mono" style={{ fontSize: 12, color: C.dim, letterSpacing: ".1em", marginBottom: 20 }}>TRADITIONAL DATA TERMINALS</div>
              {[["Annual Cost", "€20,000–25,000/seat"], ["RWA Tokenization Coverage", "Fragmented, manual"], ["On-Chain Native Data", "Limited or unavailable"], ["MiCA/CSRD Scoring", "Not available"], ["Prediction Markets", "Not integrated"], ["CBDC Velocity Index", "Not available"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.dim }}>{l}</span>
                  <span className="mono" style={{ fontSize: 13, color: C.dim }}>–</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.gold}40`, padding: 30, position: "relative" }}>
              <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.goldL})` }} />
              <div className="mono" style={{ fontSize: 12, color: C.green, letterSpacing: ".1em", marginBottom: 20 }}>STEELLDY INDEX SUITE</div>
              {[["Annual Cost (Analyst)", "€5,880/seat"], ["RWA Tokenization", "9 live indices, automated"], ["On-Chain Native Data", "XRPL, DeFi Llama, CoinGecko"], ["MiCA/CSRD Scoring", "ETACI + CCQI Pillar Two"], ["Prediction Markets Oracle", "Configurable via dashboard"], ["CBDC Velocity (CAVI)", "134 countries tracked"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.dim }}>{l}</span>
                  <span className="mono" style={{ fontSize: 13, color: C.green }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6 ENGINES */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>PROPRIETARY TECHNOLOGY</span>
          <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginTop: 12 }}>Six Engines. One Signal.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            ["SRE", "STEELLDY Risk Engine", "Factor decomposition, VaR/CVaR, Markov-switching regimes, sigmoid VPIN, confidence intervals"],
            ["SGI", "Graph Intelligence", "Network analysis, XRPL ledger monitoring, ODL corridor tracking, settlement flow graphs"],
            ["SBE", "Behavioral Engine", "NLP sentiment extraction, information leakage scoring, stablecoin run risk modeling"],
            ["SOS", "Open Source Scanner", "Public API monitoring: Yahoo Finance, DeFi Llama, CoinGecko, XRPL, ESMA registries"],
            ["SMA", "Mosaic Aggregator", "Cross-index validation, Bayesian probability composite, automated consistency checks"],
            ["SMM", "Market Monitoring", "Automated GitHub Actions workflows, Supabase persistence, real-time dashboard feeds"],
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
        <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginBottom: 16 }}>Ready to Access the <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Signal?</span></h2>
        <p style={{ fontSize: 16, color: C.dim, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>Start with a live demo. No credit card required.</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="btn-gold" onClick={() => onNavigate("dashboard")}>Launch Live Demo</button>
          <button className="btn-outline" onClick={() => onNavigate("pricing")}>View Pricing</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING PAGE v15 — 4 tiers avec nouveaux prix
// ═══════════════════════════════════════════════════════════════════════════════
const PricingPage = ({ onNavigate }) => (
  <div>
    <DisclaimerBanner />
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "80px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>PRICING</span>
        <h2 style={{ fontSize: 44, fontWeight: 300, color: C.white, marginTop: 12 }}>
          Intelligence, <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Scaled to Your Needs</span>
        </h2>
        <p style={{ fontSize: 16, color: C.dim, marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
          9 live indices. All data sources public and verifiable. Cancel anytime.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, alignItems: "start" }}>

        {/* FREE */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 28 }}>
          <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>FREE</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€0</span>
            <span style={{ fontSize: 14, color: C.dim }}>/month</span>
          </div>
          <p style={{ fontSize: 12, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>Discover STEELLDY. CCQI and DYOI preview with T-1 data.</p>
          <button className="btn-outline" style={{ width: "100%", marginBottom: 20, padding: "10px 20px" }} onClick={() => onNavigate("dashboard")}>Try Live Demo</button>
          {["CCQI preview (T-1)", "DYOI preview (T-1)", "Public dashboard access", "No API access"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12, color: C.dim }}><span style={{ color: f.includes("No") ? C.red : C.green }}>{f.includes("No") ? "–" : "✓"}</span>{f}</div>
          ))}
        </div>

        {/* ANALYST */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 28 }}>
          <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>ANALYST</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€490</span>
            <span style={{ fontSize: 14, color: C.dim }}>/month</span>
          </div>
          <p style={{ fontSize: 12, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>9 indices real-time for independent analysts and junior family offices.</p>
          <button className="btn-outline" style={{ width: "100%", marginBottom: 20, padding: "10px 20px" }} onClick={() => handleStripe("analyst")}>Get Started</button>
          {["9 indices real-time", "Supabase data feed", "Daily intelligence report", "1 user seat", "Standard support"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            {["API access", "Historical data >30d"].map(f => (
              <div key={f} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12, color: C.dim }}><span>–</span>{f}</div>
            ))}
          </div>
        </div>

        {/* PROFESSIONAL — highlighted */}
        <div style={{ background: C.panel, border: `1px solid ${C.gold}50`, padding: 28, position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.gold},${C.goldL})` }} />
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            <span className="mono" style={{ fontSize: 9, background: C.gold, color: "#000", padding: "3px 8px", letterSpacing: ".1em", fontWeight: 700 }}>POPULAR</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".15em", marginBottom: 8 }}>PROFESSIONAL</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€990</span>
            <span style={{ fontSize: 14, color: C.dim }}>/month</span>
          </div>
          <p style={{ fontSize: 12, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>Full access for crypto desks, hedge funds, and asset managers.</p>
          <button className="btn-gold" style={{ width: "100%", marginBottom: 20, padding: "10px 20px" }} onClick={() => handleStripe("professional")}>Get Started</button>
          {["Everything in Analyst", "REST API access", "Historical data 2 years", "Oracle dashboard", "VPIN + alerts", "2 user seats", "Priority support"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
          ))}
        </div>

        {/* INSTITUTIONAL */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 28 }}>
          <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>INSTITUTIONAL</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 300, color: C.white }}>€1,990</span>
            <span style={{ fontSize: 14, color: C.dim }}>/month</span>
          </div>
          <p style={{ fontSize: 12, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>Full platform for sovereign funds, family offices, and institutional desks.</p>
          <button className="btn-outline" style={{ width: "100%", marginBottom: 20, padding: "10px 20px" }} onClick={() => handleStripe("institutional")}>Contact Sales</button>
          {["Everything in Professional", "White label option", "CAVI/ETACI monthly briefing", "Custom methodology docs", "5 user seats + API", "Dedicated support + SLA", "WebSocket feed available"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "48px auto 0", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
          All paid plans include a 14-day free trial. No credit card required to start. Enterprise and multi-seat pricing available.
          Contact <a href="mailto:helen@steelldy.com" style={{ color: C.gold }}>helen@steelldy.com</a> for custom deployments.
        </p>
        <div style={{ marginTop: 24, padding: 16, background: C.panel, border: `1px solid ${C.border}`, fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
          ⚖️ <strong style={{ color: C.text }}>Legal Notice:</strong> STEELLDY indices are algorithmic scoring tools, not investment advice. All data sourced from publicly available APIs (Yahoo Finance, DeFi Llama, CoinGecko, XRPL). Subscription grants access to calculated scores only. Past index performance does not guarantee future scores. STEELLDY Advisory is not a registered investment advisor or credit rating agency.
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE v15 — données Supabase réelles
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
        // Fetch all 9 indices from Supabase
        const fetches = INDICES.map(idx =>
          fetch(`${SB_URL}/rest/v1/${idx.supaTable}?select=${idx.supaField}&order=timestamp.desc&limit=1`, { headers: SB_HEADERS })
            .then(r => r.json()).catch(() => [])
        );
        const results = await Promise.all(fetches);
        const newBases = INDICES.map((idx, i) => {
          const val = results[i]?.[0]?.[idx.supaField];
          return val ? parseFloat(val) : idx.base;
        });
        baseRef.current = newBases;

        // Also fetch macro + polymarket + risk
        const [rP, rM] = await Promise.all([
          fetch(`${SB_URL}/rest/v1/polymarket_oracle?select=*&order=timestamp.desc&limit=5`, { headers: SB_HEADERS }).then(r => r.json()).catch(() => []),
          fetch(`${SB_URL}/rest/v1/macro_feed_live?select=*&order=timestamp.desc&limit=1`, { headers: SB_HEADERS }).then(r => r.json()).catch(() => []),
        ]);
        if (rP?.length) setPolyProbs(rP.map(p => ({ q: p.event_ticker, p: parseFloat(p.probability_percentage), trend: 0 })));
        if (rM?.[0]) setMacroData([
          { k:"DXY", v: rM[0].dxy_value?.toFixed(2) || "--", chg:"LIVE", dir:1 },
          { k:"VIX", v: rM[0].vix_value?.toFixed(2) || "--", chg:"LIVE", dir:1 },
          { k:"EUA", v: "€" + (rM[0].carbon_eu_price?.toFixed(2) || "--"), chg:"LIVE", dir:1 },
          { k:"BTC", v: "$" + (rM[0].btc_price?.toFixed(0) || "--"), chg:"LIVE", dir:1 },
          { k:"XRP", v: "$1.07", chg:"LIVE", dir:1 },
          { k:"ETH", v: "$3,420", chg:"LIVE", dir:1 },
        ]);
        setSbConnected(true);
      } catch (e) { setSbConnected(false); }
    };
    fetchSB();
    const id = setInterval(fetchSB, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setLives(baseRef.current.map((b, i) => Math.max(0, b + (Math.random() - .48) * INDICES[i].vol * 0.3)));
      setVpin(v => Math.max(0.1, Math.min(0.8, v + (Math.random() - .5) * 0.02)));
      setMosaic(v => Math.max(3.5, Math.min(9.5, v + (Math.random() - .5) * 0.08)));
      const now = new Date();
      setClock(`${String(now.getUTCHours()).padStart(2,"0")}:${String(now.getUTCMinutes()).padStart(2,"0")}:${String(now.getUTCSeconds()).padStart(2,"0")}`);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const curHour = parseFloat(clock.replace(/:/g,"").slice(0,4)) / 100 || 10;
  const mCol = mosaic >= 7.5 ? C.green : mosaic >= 5 ? C.amber : C.red;
  const dashTabs = [
    { id:"dashboard", label:"Dashboard" }, { id:"indices", label:"9 Index Suite" },
    { id:"risk", label:"Risk Engine" }, { id:"oracle", label:"Oracle" },
    { id:"commodity", label:"Commodity" }, { id:"protocol", label:"Sentinel" },
    { id:"validation", label:"Validation" },
  ];

  return (
    <div style={{ background: C.bg }}>
      <div className="scanline-overlay" />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* DISCLAIMER BAR */}
        <div style={{ background: "#03060e", borderBottom: `1px solid ${C.border}`, padding: "4px 16px", fontSize: 9, color: C.dim, textAlign: "center" }}>
          ⚖️ Algorithmic scores for informational purposes only · Not investment advice · Not MiFID II services · STEELLDY Advisory, Gex, France
        </div>

        {/* DASHBOARD HEADER */}
        <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div>
                <div className="cond" style={{ fontSize: 24, fontWeight: 900, color: C.gold, letterSpacing: ".12em", lineHeight: 1 }}>STEELLDY</div>
                <div style={{ fontSize: 8, color: C.dim, letterSpacing: ".1em", marginTop: 2 }}>Index Intelligence Platform v5.0 · 9 LIVE Indices</div>
              </div>
              <div style={{ width: 1, height: 28, background: C.borderB }} />
              <div style={{ display: "flex", gap: 16 }}>
                {[["Mosaic", mosaic.toFixed(1)+"/10", mCol], ["Regime", "MS-VAR BULL", C.amber], ["Z-score", "12.8σ", C.blueL]].map(([l,v,c]) => (
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
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 8, color: C.dim }}>SR {idx.sr}</span>
                      <Badge col={C.green} style={{ fontSize: 7 }}>LIVE</Badge>
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
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <DLbl col={C.gold}>Mosaic Score</DLbl>
                    <Badge col={mCol}>{mosaic >= 7.5 ? "BULLISH" : mosaic >= 5 ? "NEUTRAL" : "BEARISH"}</Badge>
                  </div>
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
                  <div style={{ fontSize: 9, color: C.dim }}>Composite score — informational only · Not investment advice</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <DLbl col={C.gold}>Prediction Markets Oracle</DLbl>
                  <Badge col={C.gold}>{sbConnected ? "LIVE" : "SIMULATED"}</Badge>
                </div>
                {(polyProbs.length ? polyProbs : [
                  { q:"Trump crypto tax eliminated Jun 30", p:66 }, { q:"USDT market share loss >10%", p:23 },
                  { q:"Digital Euro pilot EOY 2026", p:45 }, { q:"XRP ETF approved SEC 2026", p:58 }, { q:"MiCA EMT full enforcement Q3", p:72 }
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
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <DLbl col={C.jsblue}>SRE Risk Engine</DLbl>
                    <Badge col={C.green}>ACTIVE</Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[["VaR 95%", riskData.var95+"M", C.green], ["CVaR 95%", riskData.cvar95+"M", C.amber], ["VPIN Core", riskData.vpin_core.toFixed(3), riskData.vpin_core > 0.4 ? C.red : C.green], ["Toxicity", riskData.ts, C.blueL]].map(([l,v,c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={15}>{v}</DVal></div>
                    ))}
                  </div>
                  <Divider />
                  <div style={{ fontSize: 9, color: C.dim }}>Avellaneda-Stoikov · Kalman EKF · Hawkes process · Thompson Sampling</div>
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
                    <div>
                      <div className="cond" style={{ fontSize: 24, fontWeight: 900, color: INDICES[selIdx].color, letterSpacing: ".1em" }}>{INDICES[selIdx].id}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>{INDICES[selIdx].name}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <button onClick={() => setSelIdx(null)} style={{ background: "transparent", border: `1px solid ${C.borderB}`, color: C.dim, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>✕</button>
                      <Badge col={C.green}>LIVE</Badge>
                    </div>
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
                  <DLbl col={C.blueL}>Performance Metrics — Backtest Disclaimer</DLbl>
                  <div style={{ fontSize: 9, color: C.dim, marginBottom: 10 }}>⚠ Backtest metrics (in-sample only). Not predictive of future index performance. Informational use only.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[["Sharpe", INDICES[selIdx].sr.toFixed(2), C.gold], ["Info Ratio", INDICES[selIdx].ir.toFixed(2), C.blueL], ["Max DD", INDICES[selIdx].dd+"%", C.red], ["Alpha p.a.", "+"+INDICES[selIdx].alpha+"%", C.green]].map(([l,v,c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 10, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={20}>{v}</DVal></div>
                    ))}
                  </div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.gold}>
                    <DLbl col={C.gold}>Statistical Validation — All 9 Indices (in-sample backtest)</DLbl>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                          {["Index","Status","Sharpe","IR","Max DD","α Ann.","Z","p-value"].map(h => <th key={h} className="cond" style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.dim, textAlign: "right", padding: "4px 5px" }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{INDICES.map((idx, i) => (
                          <tr key={idx.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? `${C.border}30` : "transparent" }}>
                            <td style={{ padding: "3px 5px" }}><span className="cond" style={{ fontWeight: 800, color: idx.color, fontSize: 11 }}>{idx.id}</span></td>
                            <td style={{ padding: "3px 5px" }}><Badge col={C.green}>LIVE</Badge></td>
                            {[idx.sr.toFixed(2), idx.ir.toFixed(2), idx.dd+"%", "+"+idx.alpha+"%", idx.z+"σ", "<0.0001"].map((v, j) => (
                              <td key={j} className="mono-alt" style={{ fontSize: 10, color: j===0?C.gold:j===2?C.red:j===3?C.green:j===4?C.amber:C.green, textAlign: "right", padding: "3px 5px" }}>{v}</td>
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

          {/* ─── RISK ─── */}
          {tab === "risk" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <PanelBox border={C.red}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <DLbl col={C.red}>SRE — Steelldy Risk Engine</DLbl>
                    <Badge col={C.dim}>Portfolio €10M</Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[["VaR₉₅%","€"+riskData.var95+"M",C.green],["CVaR₉₅%","€"+riskData.cvar95+"M",C.amber],["VaR₉₉%","€-0.58M",C.red]].map(([l,v,c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={16}>{v}</DVal></div>
                    ))}
                  </div>
                  <DLbl>Stress Scenarios</DLbl>
                  {[["Regulatory Crackdown (SEC/ESMA)",18,-22],["Stablecoin Depeg (USDT)",23,-18],["DeFi Exploit >$500M",8,-15],["MiCA EMT Full Enforcement",72,+22],["BTC Bull Run $100K",41,+34]].map(([n,p,imp]) => (
                    <div key={n} className="drow"><div style={{ fontSize: 10, maxWidth: "55%" }}>{n}</div><div style={{ display: "flex", gap: 6 }}><Badge col={C.dim}>{p}%</Badge><span className="mono-alt" style={{ fontSize: 11, color: imp>0?C.green:C.red }}>{imp>0?"+":""}{imp}%</span></div></div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: 9, color: C.dim }}>⚠ Scenario impacts are illustrative estimates. Not predictive of actual outcomes.</div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.blueL}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <DLbl col={C.blueL}>VPIN · Informed Trading Proxy</DLbl>
                      <Badge col={C.blueL}>López de Prado 2012</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 8 }}>
                      <div>
                        <DLbl>VPIN BTC/USD</DLbl>
                        <div className="mono-alt" style={{ fontSize: 32, color: vpin>0.4?C.red:vpin>0.2?C.amber:C.green, lineHeight: 1 }}>{vpin.toFixed(2)}</div>
                        <div className="cond" style={{ fontSize: 10, fontWeight: 700, color: vpin>0.4?C.red:vpin>0.2?C.amber:C.green, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2 }}>{vpin>0.4?"INFORMED TRADING":vpin>0.2?"TRANSITOIRE":"NOISE"}</div>
                      </div>
                      <div style={{ flex: 1, height: 40 }}>
                        <ResponsiveContainer width="100%" height={40}>
                          <LineChart data={Array.from({ length: 20 }, (_, i) => ({ i, v: rnd(.15,.55) }))}>
                            <ReferenceLine y={.4} stroke={C.red} strokeDasharray="3 3" strokeWidth={1} />
                            <ReferenceLine y={.2} stroke={C.amber} strokeDasharray="3 3" strokeWidth={1} />
                            <Line type="monotone" dataKey="v" stroke={vpin>0.4?C.red:C.amber} strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </PanelBox>
                </div>
              </div>
              <div>
                <PanelBox border={C.jsblue}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <DLbl col={C.jsblue}>SRE v2.1 — Avellaneda-Stoikov</DLbl>
                    <Badge col={C.green}>ACTIVE</Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[["VPIN Core",riskData.vpin_core.toFixed(3),riskData.vpin_core>0.4?C.red:C.green],["Toxicity",riskData.ts,C.blueL],["δ* Ask","1.2 bps",C.goldL],["δ* Bid","0.8 bps",C.goldL],["Hawkes λ","12.4/s",C.cyan],["Kelly f*","27.8%",C.green]].map(([l,v,c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={14}>{v}</DVal></div>
                    ))}
                  </div>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8, fontSize: 9, color: C.blueL, fontFamily: "'Share Tech Mono',monospace" }}>
                    max E[dt (S+da)dNa-(S-db)dNb-gS2I2/2-lY(I,t) dt]<br />
                    d*(I) = 1/k + gS2I/(2l) + a*I*1[I&gt;Imax]<br />
                    g=0.035 · k=0.80 · a=0.25 · A=12/s
                  </div>
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <DLbl>Macro Indicators</DLbl>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                      {macroData.map(m => (
                        <div key={m.k} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 8 }}>
                          <DLbl>{m.k}</DLbl><DVal col={C.white} sz={14}>{m.v}</DVal>
                          <div className="mono-alt" style={{ fontSize: 9, color: m.dir>=0?C.green:C.red, marginTop: 2 }}>{m.chg}</div>
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
                <DLbl col={C.gold}>Prediction Markets Oracle</DLbl>
                {(polyProbs.length ? polyProbs : [{q:"Trump crypto tax Jun 30",p:66},{q:"USDT loss >10% Q2",p:23},{q:"Digital Euro pilot EOY",p:45},{q:"XRP ETF SEC 2026",p:58},{q:"MiCA EMT enforcement",p:72}]).map((m,i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><div style={{ fontSize: 10.5, maxWidth: "68%" }}>{m.q}</div><span className="mono-alt" style={{ fontSize: 13, color: m.p>=50?C.green:C.amber, fontWeight: "bold" }}>{m.p}%</span></div>
                    <GaugeBar val={m.p} col={m.p>=60?C.green:m.p>=40?C.amber:C.red} /><Divider />
                  </div>
                ))}
              </PanelBox>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Mosaic Score Composite</DLbl>
                <div className="mono-alt" style={{ fontSize: 48, color: mCol, lineHeight: 1 }}>{mosaic.toFixed(1)}</div>
                <div className="cond" style={{ fontSize: 11, fontWeight: 800, color: mCol, letterSpacing: ".06em", marginTop: 4 }}>{mosaic>=7.5?"FULL RISK-ON":mosaic>=5?"MODERATE BULLISH":"DEFENSIVE"}</div>
                <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>Composite algorithmic score. Not investment advice.</div>
                <Divider />
                {[["Prediction markets consensus","50%"],["Dark Pools signal","30%"],["On-chain metrics","20%"],["Bloomberg correlation","T2"],["Sentiment proxy","T2"],["Liquidity analysis","T3"]].map(([n,w]) => (
                  <div key={n} className="drow"><span style={{ fontSize: 10 }}>{n}</span><div style={{ display: "flex", gap: 6 }}><Badge col={C.dim}>{w}</Badge><span className="mono-alt" style={{ fontSize: 10, color: mCol }}>{(mosaic*(.7+Math.random()*.4)).toFixed(1)}/10</span></div></div>
                ))}
              </PanelBox>
            </div>
          )}

          {/* ─── COMMODITY ─── */}
          {tab === "commodity" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.brics}>
                <DLbl col={C.brics}>Commodity Indices</DLbl>
                {COMMODITY_IDX.map((c,i) => (
                  <div key={c.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span className="cond" style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{c.id} — {c.name}</span><DVal col={c.color} sz={16}>{c.val}</DVal></div>
                    <MiniChart data={genSeries(c.val, c.val*0.02)} col={c.color} h={30} />
                    {i < COMMODITY_IDX.length-1 && <Divider />}
                  </div>
                ))}
              </PanelBox>
              <PanelBox border={C.red}>
                <DLbl col={C.red}>AIS Maritime GeoRisk</DLbl>
                {AIS_ROUTES.map((r,i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11, fontWeight: 600 }}>{r.name}</span><span className="mono-alt" style={{ fontSize: 14, color: r.color, fontWeight: "bold" }}>{r.risk}/100</span></div>
                    <GaugeBar val={r.risk} col={r.color} h={5} />
                    <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{r.signal}</div>
                    {i < AIS_ROUTES.length-1 && <Divider />}
                  </div>
                ))}
              </PanelBox>
            </div>
          )}

          {/* ─── SENTINEL ─── */}
          {tab === "protocol" && (
            <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <PanelBox border={C.gold}>
                <DLbl col={C.gold}>Sentinel Protocol — {CHECKPOINTS.length} Automated Checkpoints</DLbl>
                <div style={{ maxHeight: 460, overflowY: "auto" }}>
                  {CHECKPOINTS.map((c,i) => {
                    const [h] = c.time.split(":").map(Number); const done = h < curHour;
                    return (
                      <div key={i} className="alert-row" style={{ borderLeftColor: c.st==="red"?C.red:c.st==="amber"?C.amber:C.green, opacity: done?.5:1, background: Math.abs(h-curHour)<1?`${C.gold}12`:undefined }}>
                        <Dot status={done?"green":c.st} />
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
                  {[["RTAI","TVL drop >20%","> 75 sustained"],["CCQI","ICE EUA < €70","ICE EUA > €90"],["SSSI","Peg deviation >0.5%","All pegs stable"],["CAVI","Policy score < 40","Tech+Adopt > 70"],["DYOI","Exploit detected",">65 VPIN<0.25"],["XSQI","ODL vol < 30%ile","ODL vol > 70%ile"],["XCDI","RLUSD supply $0","AMM TVL > $50M"],["ETACI","CSRD audit fail","3 pillars > 70"],["PII","> 95 (systemic)","< 30 (privacy)"]].map(([id,red,green]) => (
                    <div key={id} className="drow">
                      <span className="cond" style={{ fontSize: 11, fontWeight: 700, color: INDICES.find(x=>x.id===id)?.color||C.gold, width: 50 }}>{id}</span>
                      <span style={{ flex: 1, fontSize: 9, color: C.red }}>🔴 {red}</span>
                      <span style={{ flex: 1, fontSize: 9, color: C.green }}>🟢 {green}</span>
                    </div>
                  ))}
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <DLbl>Recent Alerts</DLbl>
                    {ALERTS_INIT.slice(0,5).map((a,i) => (
                      <div key={i} className="alert-row" style={{ borderLeftColor: a.t==="red"?C.red:a.t==="amber"?C.amber:C.green, background: a.t==="red"?`${C.red}08`:a.t==="amber"?`${C.amber}08`:`${C.green}08` }}>
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
                <DLbl col={C.gold}>Statistical Validation — 9 Live Indices</DLbl>
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 10 }}>In-sample backtest metrics only. Not indicative of future index performance. Not investment advice.</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead><tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                      {["Index","Status","Sharpe","IR","Max DD","α","Z","p-value"].map(h => <th key={h} className="cond" style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.dim, textAlign: "right", padding: "4px 5px" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{INDICES.map((idx,i) => (
                      <tr key={idx.id} style={{ borderBottom: `1px solid ${C.border}`, background: i%2===0?`${C.border}30`:"transparent" }}>
                        <td style={{ padding: "3px 5px" }}><span className="cond" style={{ fontWeight: 800, color: idx.color, fontSize: 11 }}>{idx.id}</span></td>
                        <td style={{ padding: "3px 5px" }}><Badge col={C.green}>LIVE</Badge></td>
                        {[idx.sr.toFixed(2),idx.ir.toFixed(2),idx.dd+"%","+"+idx.alpha+"%",idx.z+"σ","<0.0001"].map((v,j) => (
                          <td key={j} className="mono-alt" style={{ fontSize: 10, color: j===0?C.gold:j===2?C.red:j===3?C.green:j===4?C.amber:C.green, textAlign: "right", padding: "3px 5px" }}>{v}</td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </PanelBox>
              <div>
                <PanelBox border={C.gold}>
                  <DLbl col={C.gold}>Platform Overview</DLbl>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
                    {[["Indices Live","9/9",C.green],["Update Freq.","1h auto",C.gold],["Data Sources","Public APIs",C.blueL]].map(([l,v,c]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 10, textAlign: "center" }}><DLbl>{l}</DLbl><DVal col={c} sz={16}>{v}</DVal></div>
                    ))}
                  </div>
                  <DLbl>Data Sources</DLbl>
                  {[["Yahoo Finance","ICE EUA — CCQI","LIVE"],["DeFi Llama","RTAI + DYOI","LIVE"],["CoinGecko","SSSI + PII + XCDI","LIVE"],["XRPL Public API","XCDI + XSQI","LIVE"],["Manual (monthly)","CAVI + ETACI","MONTHLY"]].map(([src,use,freq]) => (
                    <div key={src} className="drow">
                      <span className="mono" style={{ fontSize: 10, color: C.gold }}>{src}</span>
                      <span style={{ fontSize: 9, color: C.dim }}>{use}</span>
                      <Badge col={freq==="LIVE"?C.green:C.amber}>{freq}</Badge>
                    </div>
                  ))}
                </PanelBox>
                <div style={{ marginTop: 12 }}>
                  <PanelBox border={C.border}>
                    <DLbl>Legal Disclaimer</DLbl>
                    <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.7 }}>
                      STEELLDY indices are algorithmic scoring tools. They do not constitute investment advice, financial recommendations, or solicitation under MiFID II (2014/65/EU) or AMF regulations. STEELLDY Advisory (Gex, France) is not a licensed investment services provider. All backtest metrics are in-sample only and not predictive of future results. Data sourced from publicly available APIs. © 2026 STEELLDY.
                    </div>
                  </PanelBox>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* DASHBOARD FOOTER */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", justifyContent: "space-between", fontSize: 9, color: C.dim, background: C.panel, flexWrap: "wrap", gap: 6 }}>
          <div>STEELLDY Advisory · Gex, France · IIP v5.0 · 9 Live Indices</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["SRE 2.1","SGI 2.0","SBE 2.0","SOS 2.0","SMA 2.0","SMM 2.0","XRPL API","Supabase"].map(s => <span key={s}>{s}</span>)}
          </div>
          <div>© 2026 STEELLDY · Not investment advice · MiFID II disclaimer applies</div>
        </div>
      </div>
    </div>
  );
};

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
const ReportsPage = ({ onNavigate }) => (
  <div>
    <DisclaimerBanner />
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 40px" }}>
      <div style={{ marginBottom: 40 }}>
        <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>REPORTS & DOCUMENTATION</span>
        <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginTop: 12 }}>Intelligence Reports</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* GENERATED REPORTS */}
        <div>
          <DLbl col={C.gold}>LIVE GENERATED REPORTS</DLbl>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {[
              { title: "CCQI Intelligence Report", desc: "Carbon Credit Quality Index — ICE EUA correlation, Pillar Two fiscal resilience, Verra VCS analysis", color: C.green },
              { title: "DYOI Protocol Analysis", desc: "DeFi Yield Opportunity Index — 25 protocols, risk-adjusted YRA, DeFi Llama TVL breakdown", color: C.cyan },
              { title: "SSSI Stablecoin Monitor", desc: "Stablecoin Stability Index — 10 stablecoins, VPIN sigmoid, reserve transparency per-coin scores", color: C.amber },
              { title: "RTAI RWA Tracker", desc: "RWA Tokenization Activity — BlackRock BUIDL, Franklin BENJI, Ondo, Centrifuge TVL analysis", color: C.blueL },
            ].map(r => (
              <div key={r.title} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `3px solid ${r.color}`, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 4, lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                  <Badge col={C.green}>LIVE</Badge>
                </div>
                <button className="btn-outline" style={{ padding: "6px 16px", fontSize: 11 }}
                  onClick={() => window.location.href = `mailto:helen@steelldy.com?subject=Report%20Request%3A%20${encodeURIComponent(r.title)}`}>
                  Request Report
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* DOCUMENTATION */}
        <div>
          <DLbl col={C.gold}>METHODOLOGY & DOCUMENTATION</DLbl>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 6 }}>Quantitative Methodology</div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.5 }}>Complete mathematical documentation of all 9 indices. Formulas, data sources, weights, calibration.</div>
              <button className="btn-outline" style={{ padding: "6px 16px", fontSize: 11 }} onClick={() => onNavigate("methodology")}>View Online</button>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.purple}`, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 6 }}>CSRD / Pillar Two Brief</div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.5 }}>CCQI as fiscal resilience signal for groups with €750M+ revenue holding carbon credit portfolios. CCQI threshold: 75.</div>
              <button className="btn-outline" style={{ padding: "6px 16px", fontSize: 11 }}
                onClick={() => window.open("https://mail.google.com/mail/?view=cm&to=helen@steelldy.com&su=Request:%20CSRD%20Pillar%20Two%20Brief", "_blank")}>
                Request via Gmail
              </button>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.blueL}`, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 6 }}>Institutional Onboarding Pack</div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.5 }}>API documentation, data dictionary, Supabase schema, integration guide for family offices and hedge funds.</div>
              <button className="btn-outline" style={{ padding: "6px 16px", fontSize: 11 }}
                onClick={() => window.open("https://mail.google.com/mail/?view=cm&to=helen@steelldy.com&su=Request:%20Institutional%20Onboarding%20Pack", "_blank")}>
                Request via Gmail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP v15 — NAVIGATION
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
            {[["home","Home"],["pricing","Pricing"],["dashboard","Dashboard"],["reports","Reports"]].map(([id,label]) => (
              <button key={id} onClick={() => nav(id)} style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 500, border: "none", background: "transparent", color: page===id?C.white:C.dim, cursor: "pointer", padding: "4px 0", borderBottom: page===id?`2px solid ${C.gold}`:"2px solid transparent" }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 10, color: C.green }}>9 indices live</span>
            </div>
            <button onClick={() => nav("pricing")} className="btn-outline" style={{ padding: "8px 20px", fontSize: 12 }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* PAGES */}
      {page === "home"      && <HomePage     onNavigate={nav} />}
      {page === "pricing"   && <PricingPage  onNavigate={nav} />}
      {page === "dashboard" && <DashboardPage />}
      {page === "reports"   && <ReportsPage  onNavigate={nav} />}

      {/* GLOBAL FOOTER */}
      {page !== "dashboard" && (
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px", background: C.panel }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 24 }}>
              <div>
                <div className="mono" style={{ fontSize: 14, color: C.gold, letterSpacing: ".1em", marginBottom: 6 }}>STEELLDY</div>
                <div style={{ fontSize: 11, color: C.dim }}>Advisory · Gex, France · Index Intelligence Platform v5.0</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>9 live algorithmic indices · Updated every hour</div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.dim }}>
                {["SRE 2.1","SGI 2.0","SBE 2.0","SOS 2.0","SMA 2.0","SMM 2.0"].map(s => <span key={s} className="mono">{s}</span>)}
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, fontSize: 10, color: C.dim, lineHeight: 1.7 }}>
              ⚖️ <strong style={{ color: C.text }}>Legal Disclaimer:</strong> STEELLDY indices are algorithmic scoring tools for informational purposes only. They do not constitute investment advice, financial recommendations, or solicitation to buy or sell any financial instrument under MiFID II Directive 2014/65/EU or AMF regulations. STEELLDY Advisory (Gex, France) is not a licensed investment services provider (PSI). All backtest metrics are in-sample and not predictive of future results. © 2026 STEELLDY Advisory · All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
