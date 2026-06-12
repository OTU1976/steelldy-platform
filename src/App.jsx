import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SB_HEADERS = SB_KEY ? { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } : null;

// ─── STRIPE CONFIG ─────────────────────────────────────────────────────────
const STRIPE_PRICES = {
  analyst:      "price_ANALYST_PLACEHOLDER",
  professional: "price_PROFESSIONAL_PLACEHOLDER",
  institutional:"price_INSTITUTIONAL_PLACEHOLDER",
};
const handleStripe = (priceId) => {
  alert(`Stripe checkout → ${priceId}\n(Connecter Stripe pour activer)`);
};

// ─── AUTH — DEMO ACCOUNTS ────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: "demo@analyst.com",      password: "demo123", role: "analyst",      name: "Alex Chen",      tier: "Analyst",      plan: "€490/mo" },
  { email: "demo@professional.com", password: "demo123", role: "professional", name: "Sophie Laurent",  tier: "Professional", plan: "€990/mo" },
  { email: "demo@institution.com",  password: "demo123", role: "institution",  name: "Marcus Bauer",   tier: "Institutional", plan: "€1,490/mo" },
  { email: "admin@steelldy.com",    password: "admin2026!", role: "admin",      name: "Helen Admin",   tier: "Admin",        plan: "Internal" },
];

const AUTH_STORAGE_KEY = "steelldy_session";
const getSession = () => { try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)); } catch { return null; } };
const setSession = (u) => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
const clearSession = () => localStorage.removeItem(AUTH_STORAGE_KEY);
const loginUser = (email, password) => DEMO_USERS.find(u => u.email === email && u.password === password) || null;

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
@keyframes shimmer{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
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
.auth-input{width:100%;background:${C.panel2};border:1px solid ${C.border};color:${C.white};padding:12px 16px;border-radius:4px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s}
.auth-input:focus{border-color:${C.gold}80}
.auth-input::placeholder{color:${C.dim}}
.lock-overlay{position:absolute;inset:0;background:rgba(3,7,17,.85);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;border-radius:4px}
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

const MACRO_DEFAULT = [
  { k:"DXY", v:"102.4", chg:"-0.3%", dir:-1 },
  { k:"VIX", v:"18.2",  chg:"+1.8",  dir:1  },
  { k:"EUA", v:"€85.40",chg:"+2.1%", dir:1  },
  { k:"BTC", v:"$70,840",chg:"+1.4%",dir:1  },
  { k:"XRP", v:"$2.48", chg:"+3.2%", dir:1  },
  { k:"ETH", v:"$3,820",chg:"+2.1%", dir:1  },
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
const GaugeBar = ({ val, max = 100, col = C.gold, h = 3 }) => (
  <div style={{ height: h, background: C.border, borderRadius: 1, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min((val / max) * 100, 100)}%`, background: col, borderRadius: 1, transition: "width .5s" }} />
  </div>
);

// ─── LOCK OVERLAY ─────────────────────────────────────────────────────────────
const LockOverlay = ({ tier, onUpgrade }) => (
  <div className="lock-overlay">
    <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
    <div className="mono" style={{ fontSize: 13, color: C.gold, marginBottom: 6 }}>ACCÈS RESTREINT</div>
    <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginBottom: 16 }}>
      Disponible à partir du plan <span style={{ color: C.white }}>{tier}</span>
    </div>
    <button className="btn-gold" style={{ padding: "8px 24px", fontSize: 12 }} onClick={onUpgrade}>
      Upgrade Plan
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const AuthPage = ({ onLogin, onNavigate }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (mode === "login") {
        const user = loginUser(email, password);
        if (user) { onLogin(user); }
        else { setError("Email ou mot de passe incorrect."); }
      } else {
        if (!name || !email || !password) { setError("Tous les champs sont requis."); setLoading(false); return; }
        if (password.length < 6) { setError("Mot de passe minimum 6 caractères."); setLoading(false); return; }
        const newUser = { email, password, role: "analyst", name, tier: "Analyst", plan: "€490/mo" };
        onLogin(newUser);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${C.gold}06 0%, transparent 70%)` }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: C.gold, letterSpacing: ".14em" }}>STEELLDY</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4, letterSpacing: ".08em" }}>QUANTITATIVE INDEX INTELLIGENCE</div>
        </div>

        {/* DEMO HINT */}
        <div style={{ background: `${C.gold}08`, border: `1px solid ${C.gold}20`, borderRadius: 4, padding: 14, marginBottom: 24 }}>
          <div className="cond" style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: ".08em", marginBottom: 8 }}>COMPTES DÉMO</div>
          {[
            ["demo@analyst.com", "Analyst — €490/mo"],
            ["demo@professional.com", "Professional — €990/mo"],
            ["demo@institution.com", "Institutional — €1,490/mo"],
          ].map(([e, label]) => (
            <div key={e} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, cursor: "pointer" }}
              onClick={() => { setEmail(e); setPassword("demo123"); setMode("login"); }}>
              <span className="mono" style={{ fontSize: 10, color: C.blueL }}>{e}</span>
              <span style={{ fontSize: 10, color: C.dim }}>{label}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Mot de passe : <span className="mono" style={{ color: C.white }}>demo123</span> · Cliquez pour pré-remplir</div>
        </div>

        {/* FORM */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: 4, padding: 32 }}>
          {/* TABS */}
          <div style={{ display: "flex", gap: 0, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
            {[["login", "Se connecter"], ["register", "Créer un compte"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", color: mode === m ? C.gold : C.dim, fontFamily: "'Barlow Condensed'", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", borderBottom: mode === m ? `2px solid ${C.gold}` : "2px solid transparent", marginBottom: -1 }}>
                {label}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 6, fontWeight: 600 }}>NOM COMPLET</label>
              <input className="auth-input" placeholder="Jean Dupont" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 6, fontWeight: 600 }}>EMAIL</label>
            <input className="auth-input" type="email" placeholder="vous@institution.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: C.dim, display: "block", marginBottom: 6, fontWeight: 600 }}>MOT DE PASSE</label>
            <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>

          {error && (
            <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}40`, borderRadius: 4, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.red }}>{error}</div>
          )}

          <button className="btn-gold" style={{ width: "100%", opacity: loading ? .7 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Connexion..." : mode === "login" ? "Se connecter →" : "Créer mon compte →"}
          </button>

          {mode === "login" && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ fontSize: 12, color: C.dim }}>Pas encore de compte ? </span>
              <button onClick={() => setMode("register")} style={{ background: "none", border: "none", color: C.gold, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>S'inscrire</button>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", color: C.dim, fontSize: 12, cursor: "pointer" }}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const UserDashboard = ({ user, onNavigate, onLogout }) => {
  const [tab, setTab] = useState("overview");
  const [lives, setLives] = useState(INDICES.map(x => x.base));
  const [clock, setClock] = useState("");
  const [sbConnected, setSbConnected] = useState(false);
  const [euaPrice, setEuaPrice] = useState(null);
  const [defiTvl, setDefiTvl] = useState(null);

  const canAccessDYOI = user.role !== "analyst";
  const canAccessReports = user.role !== "analyst";

  useEffect(() => {
    const id = setInterval(() => {
      setLives(INDICES.map(x => Math.max(0, x.base + (Math.random() - .48) * x.vol * 0.3)));
      const now = new Date();
      setClock(`${String(now.getUTCHours()).padStart(2,"0")}:${String(now.getUTCMinutes()).padStart(2,"0")}:${String(now.getUTCSeconds()).padStart(2,"0")}`);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!SB_HEADERS) return;
    const fetchData = async () => {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/market_data?select=*&order=timestamp.desc&limit=1`, { headers: SB_HEADERS });
        const d = await r.json();
        if (d?.[0]) {
          setEuaPrice(d[0].eua_price);
          setDefiTvl(d[0].defi_tvl);
          setSbConnected(true);
        }
      } catch { setSbConnected(false); }
    };
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  const ccqiLive = lives[1];
  const dyoiLive = lives[4];
  const ccqiChg = ((ccqiLive - INDICES[1].base) / INDICES[1].base * 100);
  const dyoiChg = ((dyoiLive - INDICES[4].base) / INDICES[4].base * 100);

  const CCQI_COMPONENTS = [
    { name: "Verification Rigor",  weight: 30, val: 94, col: C.green },
    { name: "Permanence Score",    weight: 25, val: 88, col: C.blueL },
    { name: "Additionality",       weight: 25, val: 92, col: C.cyan },
    { name: "Co-Benefits",         weight: 20, val: 95, col: C.gold },
  ];

  const DYOI_PROTOCOLS = [
    { name: "Aave v3",      apy: 4.12, risk: 18, score: 88, col: C.cyan },
    { name: "Compound v3",  apy: 3.84, risk: 20, score: 82, col: C.blueL },
    { name: "Curve 3pool",  apy: 5.20, risk: 25, score: 79, col: C.gold },
    { name: "Uniswap v3",   apy: 6.40, risk: 32, score: 74, col: C.purple },
    { name: "Morpho",       apy: 4.80, risk: 22, score: 77, col: C.green },
    { name: "Spark",        apy: 3.60, risk: 15, score: 84, col: C.amber },
    { name: "Convex",       apy: 7.10, risk: 38, score: 68, col: C.red },
    { name: "Yearn v3",     apy: 5.50, risk: 28, score: 72, col: C.pink },
    { name: "Balancer",     apy: 4.90, risk: 27, score: 75, col: C.orange },
    { name: "Pendle",       apy: 8.20, risk: 42, score: 65, col: C.teal },
  ];

  const REPORTS = [
    { title: "CCQI Monthly Report — June 2026",   date: "2026-06-01", tier: "analyst",      size: "2.4 MB", type: "PDF" },
    { title: "DYOI Protocol Analysis Q2 2026",    date: "2026-06-01", tier: "professional", size: "4.1 MB", type: "PDF" },
    { title: "CSRD/Pillar Two Compliance Brief",  date: "2026-05-15", tier: "analyst",      size: "1.8 MB", type: "PDF" },
    { title: "STEELLDY Quant Methodology v4.0",   date: "2026-05-01", tier: "analyst",      size: "5.2 MB", type: "PDF" },
    { title: "Full Index Suite — API Docs v2",    date: "2026-04-20", tier: "professional", size: "3.0 MB", type: "PDF" },
    { title: "Institutional Onboarding Pack",     date: "2026-04-01", tier: "institution",  size: "8.5 MB", type: "ZIP" },
  ];

  const tierOrder = { analyst: 0, professional: 1, institution: 2, admin: 3 };
  const canDownload = (reportTier) => tierOrder[user.role] >= tierOrder[reportTier];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* USER DASHBOARD HEADER */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div onClick={() => onNavigate("home")} style={{ cursor: "pointer" }}>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: C.gold, letterSpacing: ".14em" }}>STEELLDY</span>
            </div>
            <div style={{ width: 1, height: 24, background: C.borderB }} />
            {[["overview", "Overview"], ["ccqi", "CCQI"], ["dyoi", "DYOI"], ["reports", "Reports"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 500, border: "none", background: "transparent", color: tab === id ? C.white : C.dim, cursor: "pointer", padding: "4px 0", borderBottom: tab === id ? `2px solid ${C.gold}` : "2px solid transparent" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: C.white, fontWeight: 600 }}>{user.name}</div>
              <div className="mono" style={{ fontSize: 10, color: C.gold }}>{user.tier} · {user.plan}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 10, color: C.green }}>{sbConnected ? "LIVE" : "DEMO"}</span>
            </div>
            <button className="btn-outline" style={{ padding: "6px 16px", fontSize: 11 }} onClick={onLogout}>Déconnexion</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 28, fontWeight: 300, color: C.white }}>Bonjour, <span style={{ color: C.gold }}>{user.name.split(" ")[0]}</span></h1>
              <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Tableau de bord · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {clock} UTC</p>
            </div>

            {/* KPI STRIP */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "CCQI TODAY", val: ccqiLive.toFixed(1), chg: ccqiChg, col: C.green, sub: euaPrice ? `EUA €${euaPrice.toFixed(2)}` : "Carbon Credit Quality" },
                { label: "DYOI TODAY", val: canAccessDYOI ? dyoiLive.toFixed(1) : "••••", chg: canAccessDYOI ? dyoiChg : 0, col: C.cyan, sub: defiTvl ? `TVL $${(defiTvl/1e9).toFixed(1)}B` : "DeFi Yield Index" },
                { label: "EUA PRICE",  val: euaPrice ? `€${euaPrice.toFixed(2)}` : "€72.86", chg: 1.2, col: C.gold, sub: "ICE European Carbon" },
                { label: "DEFI TVL",   val: defiTvl ? `$${(defiTvl/1e9).toFixed(1)}B` : "$68.4B", chg: 0.8, col: C.blueL, sub: "DeFi Llama Aggregated" },
              ].map(({ label, val, chg, col, sub }, i) => (
                <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `2px solid ${col}`, padding: 20, position: "relative", overflow: "hidden" }}>
                  <DLbl col={C.dim}>{label}</DLbl>
                  <div className="mono-alt" style={{ fontSize: 32, color: col, lineHeight: 1.1, marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 11, color: chg >= 0 ? C.green : C.red }}>{chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%</div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* INDEX GRID */}
            <div style={{ marginBottom: 24 }}>
              <DLbl col={C.gold}>9 INDICES — TEMPS RÉEL</DLbl>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 8 }}>
                {INDICES.map((idx, i) => {
                  const live = lives[i] || idx.base;
                  const chg = ((live - idx.base) / idx.base * 100);
                  return (
                    <div key={idx.id} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${idx.color}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div className="cond" style={{ fontSize: 14, fontWeight: 900, color: idx.color, letterSpacing: ".06em" }}>{idx.id}</div>
                        <div style={{ fontSize: 10, color: C.dim }}>{idx.name}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="mono-alt" style={{ fontSize: 20, color: C.white }}>{live.toFixed(1)}</div>
                        <div className="mono" style={{ fontSize: 10, color: chg >= 0 ? C.green : C.red }}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PLAN BANNER */}
            {user.role === "analyst" && (
              <div style={{ background: `${C.gold}08`, border: `1px solid ${C.gold}30`, borderRadius: 4, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, color: C.white, fontWeight: 600, marginBottom: 4 }}>Passez au plan Professional</div>
                  <div style={{ fontSize: 12, color: C.dim }}>Accédez à DYOI temps réel, Market Making Engine, Oracle Polymarket/Kalshi et plus.</div>
                </div>
                <button className="btn-gold" style={{ padding: "10px 24px", fontSize: 12, whiteSpace: "nowrap" }} onClick={() => onNavigate("pricing")}>
                  Voir les plans →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CCQI TAB ──────────────────────────────────────────────────── */}
        {tab === "ccqi" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <div className="cond" style={{ fontSize: 11, color: C.gold, letterSpacing: ".15em", marginBottom: 4 }}>CARBON CREDIT QUALITY INDEX</div>
                <h2 style={{ fontSize: 32, fontWeight: 300, color: C.white }}>CCQI</h2>
                <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Méthodologie Verra VCUs · Gold Standard · ICE EUA ρ=0.78</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono-alt" style={{ fontSize: 56, color: C.green, lineHeight: 1 }}>{ccqiLive.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: ccqiChg >= 0 ? C.green : C.red, marginTop: 4 }}>{ccqiChg >= 0 ? "▲" : "▼"} {Math.abs(ccqiChg).toFixed(2)}% today</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
              <div>
                {/* COMPONENTS */}
                <PanelBox border={C.green} style={{ marginBottom: 16 }}>
                  <DLbl col={C.green}>COMPOSANTES DE L'INDICE</DLbl>
                  {CCQI_COMPONENTS.map((c, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: C.text }}>{c.name}</span>
                        <span className="mono" style={{ fontSize: 13, color: c.col }}>{c.val}/100 <span style={{ color: C.dim }}>({c.weight}%)</span></span>
                      </div>
                      <GaugeBar val={c.val} col={c.col} h={4} />
                    </div>
                  ))}
                </PanelBox>

                {/* IOSCO TABLE */}
                <PanelBox border={C.gold}>
                  <DLbl col={C.gold}>CONFORMITÉ IOSCO/BMR</DLbl>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                        {["Critère IOSCO", "Standard Requis", "CCQI Status"].map(h => (
                          <th key={h} className="cond" style={{ fontSize: 10, fontWeight: 700, color: C.dim, textAlign: "left", padding: "4px 8px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Governance & Accountability", "Art. 5-6 BMR", "✓ Compliant"],
                        ["Data Sufficiency", "Principle 7 IOSCO", "✓ Compliant"],
                        ["Methodology Transparency", "Art. 13 BMR", "✓ Published"],
                        ["Conflict of Interest", "Art. 4 BMR", "✓ Managed"],
                        ["Third-Party Verification", "Principle 12", "⚠ Pending Audit"],
                      ].map(([a, b, c], i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? `${C.border}20` : "transparent" }}>
                          <td style={{ padding: "8px", fontSize: 12, color: C.text }}>{a}</td>
                          <td className="mono" style={{ padding: "8px", fontSize: 11, color: C.dim }}>{b}</td>
                          <td style={{ padding: "8px", fontSize: 11, color: c.startsWith("✓") ? C.green : C.amber }}>{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </PanelBox>
              </div>

              <div>
                <PanelBox border={C.green} style={{ marginBottom: 16 }}>
                  <DLbl col={C.green}>PILLAR TWO INDICATOR</DLbl>
                  <div className="mono-alt" style={{ fontSize: 48, color: ccqiLive < 75 ? C.amber : C.green, marginBottom: 4 }}>{ccqiLive.toFixed(1)}</div>
                  <div style={{ fontSize: 12, color: ccqiLive < 75 ? C.amber : C.green }}>
                    {ccqiLive < 75 ? "⚠ BELOW THRESHOLD — Fiscal exposure signal" : "✓ ABOVE THRESHOLD — Compliant"}
                  </div>
                  <Divider />
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
                    Un score CCQI inférieur à 75 signale une exposition fiscale potentielle sous BEPS Pilier Deux pour les groupes avec revenus &gt;€750M détenant des crédits carbone.
                  </div>
                </PanelBox>
                <PanelBox border={C.gold}>
                  <DLbl col={C.gold}>MARKET STATS</DLbl>
                  {[["Sharpe Ratio", "3.10"], ["Info. Ratio", "2.14"], ["Max Drawdown", "-12%"], ["Alpha (1Y)", "+52%"], ["Z-Score", "11.3σ"]].map(([l, v], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.dim }}>{l}</span>
                      <span className="mono" style={{ fontSize: 12, color: i === 2 ? C.red : C.gold }}>{v}</span>
                    </div>
                  ))}
                </PanelBox>
              </div>
            </div>
          </div>
        )}

        {/* ── DYOI TAB ──────────────────────────────────────────────────── */}
        {tab === "dyoi" && (
          <div style={{ position: "relative" }}>
            {!canAccessDYOI && <LockOverlay tier="Professional" onUpgrade={() => onNavigate("pricing")} />}
            <div style={{ filter: canAccessDYOI ? "none" : "blur(4px)", pointerEvents: canAccessDYOI ? "auto" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                  <div className="cond" style={{ fontSize: 11, color: C.cyan, letterSpacing: ".15em", marginBottom: 4 }}>DEFI YIELD OPPORTUNITY INDEX</div>
                  <h2 style={{ fontSize: 32, fontWeight: 300, color: C.white }}>DYOI</h2>
                  <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>YRA = Gross_APY × (1 − Risk_Penalty) · 25 protocoles · Hourly</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono-alt" style={{ fontSize: 56, color: C.cyan, lineHeight: 1 }}>{dyoiLive.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: dyoiChg >= 0 ? C.green : C.red, marginTop: 4 }}>{dyoiChg >= 0 ? "▲" : "▼"} {Math.abs(dyoiChg).toFixed(2)}%</div>
                </div>
              </div>
              <PanelBox border={C.cyan}>
                <DLbl col={C.cyan}>TOP 10 PROTOCOLES — RISK-ADJUSTED APY</DLbl>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                      {["Protocole", "Gross APY", "Risk Score", "YRA Score", "Signal"].map(h => (
                        <th key={h} className="cond" style={{ fontSize: 10, fontWeight: 700, color: C.dim, textAlign: h === "Protocole" ? "left" : "right", padding: "4px 10px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DYOI_PROTOCOLS.map((p, i) => {
                      const yra = (p.apy * (1 - p.risk / 100)).toFixed(2);
                      const signal = p.score >= 80 ? "BUY" : p.score >= 70 ? "HOLD" : "MONITOR";
                      const sigCol = p.score >= 80 ? C.green : p.score >= 70 ? C.amber : C.red;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? `${C.border}20` : "transparent" }}>
                          <td style={{ padding: "10px", fontSize: 13, color: p.col, fontWeight: 600 }}>{p.name}</td>
                          <td className="mono" style={{ padding: "10px", fontSize: 12, color: C.green, textAlign: "right" }}>{p.apy.toFixed(2)}%</td>
                          <td className="mono" style={{ padding: "10px", fontSize: 12, color: p.risk > 30 ? C.red : C.amber, textAlign: "right" }}>{p.risk}/100</td>
                          <td className="mono" style={{ padding: "10px", fontSize: 12, color: C.cyan, textAlign: "right" }}>{yra}%</td>
                          <td style={{ padding: "10px", textAlign: "right" }}>
                            <span className="badge" style={{ background: sigCol + "18", color: sigCol, border: `1px solid ${sigCol}40` }}>{signal}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </PanelBox>
            </div>
          </div>
        )}

        {/* ── REPORTS TAB ───────────────────────────────────────────────── */}
        {tab === "reports" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div className="cond" style={{ fontSize: 11, color: C.gold, letterSpacing: ".15em", marginBottom: 4 }}>INTELLIGENCE REPORTS</div>
              <h2 style={{ fontSize: 28, fontWeight: 300, color: C.white }}>Documents & Rapports</h2>
              <p style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Accès selon votre plan — {user.tier}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {REPORTS.map((r, i) => {
                const allowed = canDownload(r.tier);
                return (
                  <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: allowed ? 1 : 0.6 }}>
                    <div style={{ display: "flex", align: "center", gap: 16 }}>
                      <span style={{ fontSize: 24, marginRight: 8 }}>{r.type === "PDF" ? "📄" : "📦"}</span>
                      <div>
                        <div style={{ fontSize: 14, color: C.white, fontWeight: 500 }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{r.date} · {r.size} · Plan min: <span style={{ color: C.gold, textTransform: "capitalize" }}>{r.tier}</span></div>
                      </div>
                    </div>
                    {allowed
                      ? <button className="btn-outline" style={{ padding: "6px 16px", fontSize: 11 }} onClick={() => alert(`Téléchargement: ${r.title}\n(Connecter stockage fichiers)`)}>↓ Télécharger</button>
                      : <button className="btn-outline" style={{ padding: "6px 16px", fontSize: 11, opacity: .5 }} onClick={() => onNavigate("pricing")}>🔒 Upgrade</button>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const AdminDashboard = ({ user, onLogout, onNavigate }) => {
  const [tab, setTab] = useState("overview");

  const MOCK_USERS = [
    { email: "demo@analyst.com",      name: "Alex Chen",     plan: "Analyst", status: "active", mrr: 490,   joined: "2026-05-12" },
    { email: "demo@professional.com", name: "Sophie Laurent", plan: "Professional", status: "active", mrr: 990, joined: "2026-04-20" },
    { email: "demo@institution.com",  name: "Marcus Bauer",  plan: "Institutional", status: "active", mrr: 1490, joined: "2026-03-08" },
  ];
  const totalMRR = MOCK_USERS.reduce((a, u) => a + u.mrr, 0);
  const totalARR = totalMRR * 12;

  const INDICES_STATUS = [
    { id: "CCQI", last: "2026-06-12 10:00", status: "ok",  val: 92.4, next: "1h" },
    { id: "DYOI", last: "2026-06-12 10:00", status: "ok",  val: 81.3, next: "1h" },
    { id: "RTAI", last: "2026-06-12 06:00", status: "ok",  val: 78.6, next: "6h" },
    { id: "SSSI", last: "2026-06-12 06:00", status: "warn",val: 73.2, next: "6h" },
    { id: "XCDI", last: "2026-06-12 10:00", status: "ok",  val: 72.1, next: "1h" },
    { id: "XSQI", last: "2026-06-12 06:00", status: "ok",  val: 87.4, next: "6h" },
    { id: "ETACI",last: "2026-06-11 08:00", status: "ok",  val: 68.9, next: "24h" },
    { id: "CAVI", last: "2026-06-11 08:00", status: "ok",  val: 64.8, next: "24h" },
    { id: "PII",  last: "2026-06-12 10:00", status: "ok",  val: 84.7, next: "1h" },
  ];

  const PIPELINE = [
    { prospect: "Euler Hermes SGR",     stage: "Demo",     value: "€1,490/mo", date: "2026-06-15", prob: 60 },
    { prospect: "Amundi AM",            stage: "Proposal", value: "€4,500/mo", date: "2026-06-20", prob: 30 },
    { prospect: "BNP Paribas Cardif",   stage: "Contact",  value: "€990/mo",   date: "2026-07-01", prob: 20 },
    { prospect: "Schroders ESG Team",   stage: "Demo",     value: "€990/mo",   date: "2026-06-18", prob: 45 },
  ];

  const SEO_METRICS = [
    { metric: "Google Search Console — Sitemap", status: "Soumis", col: C.green },
    { metric: "Meta OG Tags", status: "Actifs", col: C.green },
    { metric: "JSON-LD Structured Data", status: "Actifs", col: C.green },
    { metric: "robots.txt", status: "Déployé", col: C.green },
    { metric: "Core Web Vitals — LCP", status: "< 2.5s", col: C.green },
    { metric: "Core Web Vitals — CLS", status: "< 0.1", col: C.green },
    { metric: "Google Indexing Status", status: "En cours", col: C.amber },
    { metric: "VITE_STRIPE_PUBLISHABLE_KEY", status: "⚠ À configurer", col: C.red },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>STEELLDY</div>
            <div style={{ width: 1, height: 20, background: C.borderB }} />
            <span className="badge" style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}40` }}>ADMIN</span>
            {[["overview","Overview"],["users","Users"],["indices","Indices"],["pipeline","Pipeline"],["seo","SEO & Tech"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ fontFamily: "'DM Sans'", fontSize: 13, border: "none", background: "transparent", color: tab === id ? C.white : C.dim, cursor: "pointer", padding: "4px 0", borderBottom: tab === id ? `2px solid ${C.gold}` : "2px solid transparent" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.dim }}>{user.name}</span>
            <button className="btn-outline" style={{ padding: "6px 14px", fontSize: 11 }} onClick={onLogout}>Déconnexion</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }}>

        {/* ── ADMIN OVERVIEW ───────────────────────────────────────────── */}
        {tab === "overview" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 300, color: C.white, marginBottom: 24 }}>Admin Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "MRR", val: `€${totalMRR.toLocaleString()}`, sub: "Monthly Recurring", col: C.gold },
                { label: "ARR", val: `€${totalARR.toLocaleString()}`, sub: "Annual Run Rate",   col: C.green },
                { label: "CLIENTS ACTIFS", val: MOCK_USERS.length, sub: "Comptes payants", col: C.blueL },
                { label: "INDICES LIVE", val: "9/9", sub: "GitHub Actions OK", col: C.cyan },
              ].map(({ label, val, sub, col }, i) => (
                <PanelBox key={i} border={col}>
                  <DLbl>{label}</DLbl>
                  <div className="mono-alt" style={{ fontSize: 36, color: col, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>{sub}</div>
                </PanelBox>
              ))}
            </div>

            {/* QUICK ACTIONS */}
            <PanelBox border={C.gold}>
              <DLbl col={C.gold}>ACTIONS RAPIDES</DLbl>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {[
                  ["🔑 Configurer Stripe", () => alert("Aller dans Vercel → Settings → Env Variables\nAjouter: VITE_STRIPE_PUBLISHABLE_KEY")],
                  ["📊 Voir Site Live", () => window.open("https://steelldy-indices.com", "_blank")],
                  ["⚙️ GitHub Actions", () => window.open("https://github.com/OTU1976/steelldy-platform/actions", "_blank")],
                  ["🗄️ Supabase DB", () => window.open("https://supabase.com/dashboard/project/dcedzahmrvdxylmoesds", "_blank")],
                ].map(([label, action], i) => (
                  <button key={i} className="btn-outline" style={{ padding: "8px 18px", fontSize: 12 }} onClick={action}>{label}</button>
                ))}
              </div>
            </PanelBox>
          </div>
        )}

        {/* ── USERS ──────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 300, color: C.white, marginBottom: 24 }}>Gestion des Utilisateurs</h2>
            <PanelBox border={C.blueL}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                    {["Nom","Email","Plan","MRR","Status","Inscrit"].map(h => (
                      <th key={h} className="cond" style={{ fontSize: 10, fontWeight: 700, color: C.dim, textAlign: "left", padding: "6px 12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_USERS.map((u, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? `${C.border}20` : "transparent" }}>
                      <td style={{ padding: "12px", fontSize: 13, color: C.white, fontWeight: 500 }}>{u.name}</td>
                      <td className="mono" style={{ padding: "12px", fontSize: 11, color: C.dim }}>{u.email}</td>
                      <td style={{ padding: "12px" }}>
                        <span className="badge" style={{ background: C.gold + "18", color: C.gold, border: `1px solid ${C.gold}40` }}>{u.plan}</span>
                      </td>
                      <td className="mono" style={{ padding: "12px", fontSize: 13, color: C.green }}>€{u.mrr}</td>
                      <td style={{ padding: "12px" }}>
                        <span className="badge" style={{ background: C.green + "18", color: C.green, border: `1px solid ${C.green}40` }}>{u.status}</span>
                      </td>
                      <td style={{ padding: "12px", fontSize: 11, color: C.dim }}>{u.joined}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, padding: "12px 0", borderTop: `1px solid ${C.border}`, display: "flex", gap: 32 }}>
                <div><span style={{ fontSize: 11, color: C.dim }}>Total MRR : </span><span className="mono" style={{ color: C.gold }}>€{totalMRR}</span></div>
                <div><span style={{ fontSize: 11, color: C.dim }}>ARR projeté : </span><span className="mono" style={{ color: C.green }}>€{totalARR.toLocaleString()}</span></div>
              </div>
            </PanelBox>
          </div>
        )}

        {/* ── INDICES STATUS ─────────────────────────────────────────────── */}
        {tab === "indices" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 300, color: C.white, marginBottom: 24 }}>Status des Indices — GitHub Actions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {INDICES_STATUS.map((idx, i) => (
                <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `3px solid ${idx.status === "ok" ? C.green : C.amber}`, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="cond" style={{ fontSize: 16, fontWeight: 900, color: C.gold }}>{idx.id}</span>
                    <span className="badge" style={{ background: (idx.status === "ok" ? C.green : C.amber) + "18", color: idx.status === "ok" ? C.green : C.amber, border: `1px solid ${idx.status === "ok" ? C.green : C.amber}40` }}>
                      {idx.status === "ok" ? "✓ OK" : "⚠ WARN"}
                    </span>
                  </div>
                  <div className="mono-alt" style={{ fontSize: 24, color: C.white, marginBottom: 4 }}>{idx.val}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>Dernière MàJ: {idx.last}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>Prochain run: dans {idx.next}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PIPELINE ─────────────────────────────────────────────────── */}
        {tab === "pipeline" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 300, color: C.white, marginBottom: 24 }}>Pipeline Commercial</h2>
            <PanelBox border={C.gold}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.borderB}` }}>
                    {["Prospect","Étape","Valeur/mo","Date Contact","Probabilité","MRR Pondéré"].map(h => (
                      <th key={h} className="cond" style={{ fontSize: 10, fontWeight: 700, color: C.dim, textAlign: "left", padding: "6px 10px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PIPELINE.map((p, i) => {
                    const mrr = parseInt(p.value.replace(/[€,\/mo]/g, "")) * p.prob / 100;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? `${C.border}20` : "transparent" }}>
                        <td style={{ padding: "10px", fontSize: 13, color: C.white, fontWeight: 500 }}>{p.prospect}</td>
                        <td style={{ padding: "10px" }}>
                          <span className="badge" style={{ background: C.blueL + "18", color: C.blueL, border: `1px solid ${C.blueL}40` }}>{p.stage}</span>
                        </td>
                        <td className="mono" style={{ padding: "10px", fontSize: 12, color: C.gold }}>{p.value}</td>
                        <td style={{ padding: "10px", fontSize: 11, color: C.dim }}>{p.date}</td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <GaugeBar val={p.prob} col={p.prob >= 50 ? C.green : p.prob >= 30 ? C.amber : C.red} h={4} />
                            <span className="mono" style={{ fontSize: 11, color: C.text }}>{p.prob}%</span>
                          </div>
                        </td>
                        <td className="mono" style={{ padding: "10px", fontSize: 12, color: C.green }}>€{Math.round(mrr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </PanelBox>
          </div>
        )}

        {/* ── SEO & TECH ───────────────────────────────────────────────── */}
        {tab === "seo" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 300, color: C.white, marginBottom: 24 }}>SEO & Infrastructure</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <PanelBox border={C.green}>
                <DLbl col={C.green}>CHECKLIST SEO & DÉPLOIEMENT</DLbl>
                {SEO_METRICS.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12, color: C.text }}>{m.metric}</span>
                    <span className="mono" style={{ fontSize: 11, color: m.col }}>{m.status}</span>
                  </div>
                ))}
              </PanelBox>
              <div>
                <PanelBox border={C.blueL} style={{ marginBottom: 16 }}>
                  <DLbl col={C.blueL}>INFRASTRUCTURE</DLbl>
                  {[
                    ["Plateforme", "Vercel (steelldy-indices)"],
                    ["Repo GitHub", "OTU1976/steelldy-platform"],
                    ["Base de données", "Supabase dcedzahmrvdxylmoesds"],
                    ["GitHub Actions", "Hourly: CCQI + DYOI + market_data"],
                    ["Domaine", "steelldy-indices.com (GoDaddy DNS)"],
                    ["Build", "React + Vite → /dist"],
                  ].map(([k, v], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, color: C.dim }}>{k}</span>
                      <span className="mono" style={{ fontSize: 10, color: C.text }}>{v}</span>
                    </div>
                  ))}
                </PanelBox>
                <PanelBox border={C.red}>
                  <DLbl col={C.red}>⚠ ACTIONS REQUISES</DLbl>
                  {[
                    "Configurer VITE_STRIPE_PUBLISHABLE_KEY dans Vercel",
                    "Activer Stripe Checkout dans StripePricing.jsx",
                    "Committer les fichiers JSX source dans Git",
                    "Compléter audit tiers pour IOSCO BMR compliance",
                  ].map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.amber }}>
                      <span style={{ color: C.red }}>⚠</span> {a}
                    </div>
                  ))}
                </PanelBox>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

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
            Carbon & <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>DeFi Yield</span> Intelligence
          </h1>
          <p className="fade-up delay-2" style={{ fontSize: 18, color: C.dim, maxWidth: 560, lineHeight: 1.7, marginBottom: 40 }}>
            Two institutional-grade indices delivering real-time quality scoring for carbon credit markets and DeFi yield optimization. Data-driven. Audit-ready. Built for professionals.
          </p>
          <div className="fade-up delay-3" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button className="btn-gold" onClick={() => onNavigate("pricing")}>View Plans</button>
            <button className="btn-outline" onClick={() => onNavigate("auth")}>Live Demo →</button>
          </div>
          <div className="fade-up delay-4" style={{ display: "flex", gap: 40, marginTop: 60, flexWrap: "wrap" }}>
            {[["CCQI Today", "72.2"], ["DYOI Today", "64.1"], ["EUA Price", "€72.86"], ["Protocols", "25"]].map(([l, v]) => (
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
                <div key={idx.id} style={{ background: C.panel2, border: `1px solid ${C.border}`, borderTop: `2px solid ${idx.color}`, padding: 12, cursor: "pointer" }} onClick={() => onNavigate("auth")}>
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
          <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>FOCUS INDICES</span>
          <h2 style={{ fontSize: 40, fontWeight: 300, color: C.white, marginTop: 12 }}>CCQI & DYOI — <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Real Data. Real Alpha.</span></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {[
            ["CCQI — Carbon Credit Quality Index", "Le seul indice temps réel de qualité des crédits carbone. Corrélation ICE EUA ρ=0.78. CSRD/Pillar Two compliance scoring pour groupes >€750M. Un score <75 signale une exposition fiscale — c'est notre valeur proposition centrale.", C.green],
            ["DYOI — DeFi Yield Opportunity Index", "YRA = Gross_APY × (1 − Risk_Penalty). 25 protocoles DeFi scorés en temps réel. Sharpe 3.60. Identification automatique des opportunités d'arbitrage de rendement avec overlay Nexus Mutual.", C.cyan],
          ].map(([title, desc, col], i) => (
            <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderTop: `3px solid ${col}`, padding: 36 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, marginBottom: 20, animation: "pulse 2s infinite" }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.white, marginBottom: 14 }}>{title}</h3>
              <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.8 }}>{desc}</p>
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
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 30 }}>
              <div className="mono" style={{ fontSize: 12, color: C.red, letterSpacing: ".1em", marginBottom: 20 }}>BLOOMBERG TERMINAL</div>
              {[["Annual Cost", "€25,000/seat"], ["Carbon Quality", "Not available"], ["DeFi Yield Index", "None native"], ["MiCA/CSRD Scoring", "Not available"], ["Real-time on-chain", "None"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.dim }}>{l}</span>
                  <span className="mono" style={{ fontSize: 13, color: C.red }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.gold}40`, padding: 30, position: "relative" }}>
              <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.goldL})` }} />
              <div className="mono" style={{ fontSize: 12, color: C.green, letterSpacing: ".1em", marginBottom: 20 }}>STEELLDY INDEX SUITE</div>
              {[["Annual Cost (Analyst)", "€5,880/seat"], ["Carbon Quality", "CCQI — real-time"], ["DeFi Yield Index", "DYOI — 25 protocols"], ["MiCA/CSRD Scoring", "Real-time, audit-ready"], ["Real-time on-chain", "DeFi Llama + ICE EUA"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.dim }}>{l}</span>
                  <span className="mono" style={{ fontSize: 13, color: C.green }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: `linear-gradient(180deg, ${C.bg}, ${C.panel})`, padding: "80px 40px", textAlign: "center", borderTop: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 36, fontWeight: 300, color: C.white, marginBottom: 16 }}>Ready to See the <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Alpha?</span></h2>
        <p style={{ fontSize: 16, color: C.dim, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>Start with a live demo. No credit card required.</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="btn-gold" onClick={() => onNavigate("auth")}>Launch Live Demo</button>
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
  <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px" }}>
    <div style={{ textAlign: "center", marginBottom: 60 }}>
      <span className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".2em" }}>PRICING</span>
      <h2 style={{ fontSize: 44, fontWeight: 300, color: C.white, marginTop: 12 }}>
        Intelligence, <span className="serif" style={{ fontStyle: "italic", color: C.gold }}>Scaled to Your Needs</span>
      </h2>
      <p style={{ fontSize: 16, color: C.dim, marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>CCQI & DYOI. From independent analysts to institutional desks. Cancel anytime.</p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "start" }}>
      {/* ANALYST */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 32 }}>
        <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>ANALYST</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 48, fontWeight: 300, color: C.white }}>€490</span>
          <span style={{ fontSize: 14, color: C.dim }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>Essential index data for independent analysts and junior family offices.</p>
        <button className="btn-outline" style={{ width: "100%", marginBottom: 24 }} onClick={() => onNavigate("auth")}>Start Free Trial</button>
        {["CCQI (T-1 data)", "DYOI (T-1 data)", "Daily intelligence report", "1 user seat", "Standard support"].map(f => (
          <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
        ))}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          {["Real-time data", "API access", "Reports download"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: C.dim }}><span>—</span>{f}</div>
          ))}
        </div>
      </div>

      {/* PROFESSIONAL */}
      <div style={{ background: C.panel, border: `1px solid ${C.gold}50`, padding: 32, position: "relative", transform: "scale(1.03)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${C.gold},${C.goldL})` }} />
        <div style={{ position: "absolute", top: 12, right: 16 }}>
          <span className="mono" style={{ fontSize: 9, background: C.gold, color: "#000", padding: "3px 8px", letterSpacing: ".1em", fontWeight: 700 }}>MOST POPULAR</span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: C.gold, letterSpacing: ".15em", marginBottom: 8 }}>PROFESSIONAL</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 48, fontWeight: 300, color: C.white }}>€990</span>
          <span style={{ fontSize: 14, color: C.dim }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>Real-time intelligence for crypto desks, hedge funds, and asset managers.</p>
        <button className="btn-gold" style={{ width: "100%", marginBottom: 24 }} onClick={() => onNavigate("auth")}>Start Free Trial</button>
        {["Everything in Analyst", "Real-time CCQI & DYOI feed", "CSRD/Pillar Two compliance alerts", "Oracle (Polymarket + Kalshi)", "VPIN & Dark Pool alerts", "1 user + 1 API seat", "Priority support"].map(f => (
          <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
        ))}
      </div>

      {/* INSTITUTIONAL */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 32 }}>
        <div className="mono" style={{ fontSize: 11, color: C.dim, letterSpacing: ".15em", marginBottom: 8 }}>INSTITUTIONAL</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 48, fontWeight: 300, color: C.white }}>€1,490</span>
          <span style={{ fontSize: 14, color: C.dim }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>Full platform access for sovereign funds, family offices, and institutional desks.</p>
        <button className="btn-outline" style={{ width: "100%", marginBottom: 24 }} onClick={() => window.location.href = "mailto:contact@steelldy.com?subject=Institutional Plan"}>Contact Sales</button>
        {["Everything in Professional", "Full 9-index suite", "CSRD/Pillar Two full module", "Custom backtesting (CCQI 3Y)", "5 users + unlimited API", "Dedicated CSM + SLA 99.9%", "WebSocket data feed", "White-label option"].map(f => (
          <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: C.text }}><span style={{ color: C.green }}>✓</span>{f}</div>
        ))}
      </div>
    </div>

    <div style={{ maxWidth: 700, margin: "60px auto 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.8 }}>
        All plans include a 30-day free trial. No credit card required to start. Enterprise pricing available for teams of 10+.
        Contact <a href="mailto:contact@steelldy.com" style={{ color: C.gold }}>contact@steelldy.com</a> for custom deployments.
      </p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP — NAVIGATION + AUTH
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(() => getSession());

  const nav = (p) => { setPage(p); window.scrollTo(0, 0); };

  const handleLogin = (u) => {
    setSession(u);
    setUser(u);
    if (u.role === "admin") nav("admin");
    else nav("userdash");
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    nav("home");
  };

  // Auto-redirect if logged in and tries to go to auth
  const safNav = (p) => {
    if (p === "auth" && user) {
      nav(user.role === "admin" ? "admin" : "userdash");
    } else {
      nav(p);
    }
  };

  // Pages without navbar
  if (page === "auth")     return <div style={{ minHeight: "100vh", background: C.bg }}><style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} /><AuthPage onLogin={handleLogin} onNavigate={nav} /></div>;
  if (page === "userdash" && user) return <div style={{ minHeight: "100vh", background: C.bg }}><style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} /><UserDashboard user={user} onNavigate={safNav} onLogout={handleLogout} /></div>;
  if (page === "admin" && user?.role === "admin") return <div style={{ minHeight: "100vh", background: C.bg }}><style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} /><AdminDashboard user={user} onLogout={handleLogout} onNavigate={safNav} /></div>;

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user ? (
              <>
                <span style={{ fontSize: 12, color: C.dim }}>{user.name}</span>
                <button onClick={() => nav(user.role === "admin" ? "admin" : "userdash")} className="btn-outline" style={{ padding: "8px 20px", fontSize: 12 }}>Mon Dashboard</button>
                <button onClick={handleLogout} style={{ background: "none", border: "none", color: C.dim, fontSize: 12, cursor: "pointer" }}>Déconnexion</button>
              </>
            ) : (
              <>
                <button onClick={() => nav("auth")} style={{ background: "none", border: "none", color: C.dim, fontSize: 13, cursor: "pointer" }}>Se connecter</button>
                <button onClick={() => nav("pricing")} className="btn-gold" style={{ padding: "8px 20px", fontSize: 12 }}>Get Access</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* PAGES */}
      {page === "home"    && <HomePage    onNavigate={safNav} />}
      {page === "pricing" && <PricingPage onNavigate={safNav} />}

      {/* GLOBAL FOOTER */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px", background: C.panel }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: 14, color: C.gold, letterSpacing: ".1em", marginBottom: 6 }}>STEELLDY</div>
            <div style={{ fontSize: 11, color: C.dim }}>Advisory · Gex, France · Institutional Quantitative Intelligence</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>contact@steelldy.com</div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.dim }}>
            {["CCQI", "DYOI", "CSRD/Pillar Two", "DeFi Llama", "ICE EUA", "Supabase LIVE"].map(s => <span key={s} className="mono">{s}</span>)}
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>© 2026 STEELLDY · Not investment advice</div>
        </div>
      </footer>
    </div>
  );
}
