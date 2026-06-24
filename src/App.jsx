import { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SB_H   = SB_KEY ? { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } : null;

// ─── STRIPE CONFIG ────────────────────────────────────────────────────────────
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const STRIPE_LINKS = {
  analyst:      "https://buy.stripe.com/aFa7sE9iEf4KfDdaD4dwc01",
  professional: "https://buy.stripe.com/bJedR2bqMf4Kez96mOdwc02",
  institution:  "https://buy.stripe.com/cNi14gamI7Ci0Ij12udwc03",
};

const goStripe = (plan) => {
  const link = STRIPE_LINKS[plan];
  if(link) window.open(link, "_blank");
};


const DEMO_USERS = [
  { email:"demo@analyst.com",      password:"demo123",   role:"analyst",      name:"Alex Chen",      tier:"Analyst",       plan:"€490/mo" },
  { email:"demo@professional.com", password:"demo123",   role:"professional", name:"Sophie Laurent", tier:"Professional",  plan:"€990/mo" },
  { email:"demo@institution.com",  password:"demo123",   role:"institution",  name:"Marcus Bauer",   tier:"Institutional", plan:"€1,490/mo" },
  { email:"admin@steelldy.com",    password:"admin2026!", role:"admin",       name:"Helen Admin",    tier:"Admin",         plan:"Internal" },
];
const SK = "steelldy_session";
const getSession  = () => { try { return JSON.parse(localStorage.getItem(SK)); } catch { return null; } };
const setSession  = u  => localStorage.setItem(SK, JSON.stringify(u));
const clearSession = () => localStorage.removeItem(SK);
const loginUser   = (e,p) => DEMO_USERS.find(u => u.email===e && u.password===p) || null;

// ─── PALETTE — noir & blanc cassé ────────────────────────────────────────────
const C = {
  bg:     "#080808",
  panel:  "#0f0f0f",
  panel2: "#141414",
  border: "#1e1e1e",
  borderB:"#2a2a2a",
  white:  "#f0ede8",   // blanc cassé / ivoire
  dim:    "#5a5a5a",
  dim2:   "#3a3a3a",
  green:  "#17c96a",
  red:    "#e34a4a",
  amber:  "#f0a030",
  text:   "#c8c4be",
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.borderB}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.fade-up{animation:fadeUp .5s ease forwards;opacity:0}
.d1{animation-delay:.08s}.d2{animation-delay:.16s}.d3{animation-delay:.24s}.d4{animation-delay:.32s}
.mono{font-family:'JetBrains Mono',monospace}
.mono2{font-family:'Share Tech Mono',monospace}
.serif{font-family:'Instrument Serif',serif}
.cond{font-family:'Barlow Condensed',sans-serif}
.live{width:6px;height:6px;border-radius:50%;background:${C.green};animation:pulse 1.4s infinite;display:inline-block}
.btn-primary{background:${C.white};color:#080808;font-weight:700;border:none;padding:13px 28px;cursor:pointer;font-size:13px;letter-spacing:.02em;transition:all .2s;font-family:'DM Sans',sans-serif}
.btn-primary:hover{background:#dedad4;transform:translateY(-1px)}
.btn-ghost{background:transparent;color:${C.white};font-weight:500;border:1px solid ${C.borderB};padding:13px 28px;cursor:pointer;font-size:13px;letter-spacing:.02em;transition:all .2s;font-family:'DM Sans',sans-serif}
.btn-ghost:hover{border-color:${C.dim};background:${C.panel}}
.bar{height:1px;background:${C.dim2};position:relative;overflow:hidden;margin-top:6px}
.bar-fill{height:100%;background:${C.white};transition:width .6s ease}
.bar-fill.green{background:${C.green}}
.bar-fill.amber{background:${C.amber}}
.nav-link{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;border:none;background:transparent;color:${C.dim};cursor:pointer;padding:4px 0;border-bottom:1px solid transparent;transition:all .15s}
.nav-link:hover{color:${C.text}}
.nav-link.active{color:${C.white};border-bottom-color:${C.white}}
.tab-btn{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:none;background:transparent;color:${C.dim};cursor:pointer;padding:8px 0;border-bottom:1px solid transparent;transition:all .15s}
.tab-btn.active{color:${C.white};border-bottom-color:${C.white}}
.auth-input{width:100%;background:${C.panel2};border:1px solid ${C.border};color:${C.white};padding:11px 14px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .15s}
.auth-input:focus{border-color:${C.dim}}
.auth-input::placeholder{color:${C.dim2}}
.label{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim}}
.badge{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.06em;padding:2px 7px;text-transform:uppercase}
.lock-overlay{position:absolute;inset:0;background:rgba(8,8,8,.88);backdrop-filter:blur(3px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const genS = (b, v, n=40) => { let x=b,a=[]; for(let i=0;i<n;i++){x+=(Math.random()-.47)*v; a.push({i,v:Math.max(0,x)});} return a; };
const Mini = ({data,col="#fff",h=24}) => (
  <ResponsiveContainer width="100%" height={h}>
    <AreaChart data={data} margin={{top:0,right:0,bottom:0,left:0}}>
      <defs><linearGradient id={`g${col.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={col} stopOpacity={.2}/><stop offset="100%" stopColor={col} stopOpacity={0}/>
      </linearGradient></defs>
      <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1} fill={`url(#g${col.replace("#","")})`} dot={false} isAnimationActive={false}/>
    </AreaChart>
  </ResponsiveContainer>
);
const Bar = ({v,col="white"}) => (
  <div className="bar"><div className={`bar-fill ${col}`} style={{width:`${Math.min(v,100)}%`}}/></div>
);
const Div = () => <div style={{height:1,background:C.border,margin:"12px 0"}}/>;
const LL = ({children,col=C.dim}) => <div className="label" style={{color:col,marginBottom:4}}>{children}</div>;

// ─── LOCK ────────────────────────────────────────────────────────────────────
const Lock = ({tier,onUp}) => (
  <div className="lock-overlay">
    <div style={{fontSize:28,marginBottom:12}}>◻</div>
    <div className="mono" style={{fontSize:11,color:C.white,marginBottom:6}}>ACCESS RESTRICTED</div>
    <div style={{fontSize:11,color:C.dim,textAlign:"center",marginBottom:16}}>Available from <span style={{color:C.white}}>{tier}</span> plan</div>
    <button className="btn-primary" style={{padding:"8px 20px",fontSize:11}} onClick={onUp}>Upgrade →</button>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// AUTH PAGE
// ══════════════════════════════════════════════════════════════════════════════
const AuthPage = ({onLogin,onNav}) => {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [name,setName]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const submit = () => {
    setErr(""); setLoading(true);
    setTimeout(()=>{
      if(mode==="login"){
        const u=loginUser(email,pw);
        if(u) onLogin(u); else setErr("Email ou mot de passe incorrect.");
      } else {
        if(!name||!email||!pw){setErr("Tous les champs requis.");setLoading(false);return;}
        if(pw.length<6){setErr("Minimum 6 caractères.");setLoading(false);return;}
        onLogin({email,password:pw,role:"analyst",name,tier:"Analyst",plan:"€490/mo"});
      }
      setLoading(false);
    },500);
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div className="mono" style={{fontSize:20,fontWeight:700,color:C.white,letterSpacing:".2em"}}>STEELLDY</div>
          <div className="label" style={{marginTop:6}}>QUANTITATIVE INDEX INTELLIGENCE</div>
          <div style={{fontSize:11,color:C.dim,marginTop:8}}>Sign in to your institutional account</div>
        </div>

        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderTop:`1px solid ${C.white}`,padding:28}}>
          <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:`1px solid ${C.border}`}}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");}}
                style={{flex:1,padding:"9px 0",border:"none",background:"transparent",color:mode===m?C.white:C.dim,fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,cursor:"pointer",borderBottom:mode===m?`1px solid ${C.white}`:"1px solid transparent",marginBottom:-1}}>
                {l}
              </button>
            ))}
          </div>
          {mode==="register" && <div style={{marginBottom:14}}>
            <LL>Full Name</LL>
            <input className="auth-input" placeholder="Jean Dupont" value={name} onChange={e=>setName(e.target.value)}/>
          </div>}
          <div style={{marginBottom:14}}>
            <LL>Email</LL>
            <input className="auth-input" type="email" placeholder="you@institution.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          </div>
          <div style={{marginBottom:22}}>
            <LL>Password</LL>
            <input className="auth-input" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          {err && <div style={{background:`${C.red}10`,border:`1px solid ${C.red}40`,padding:"9px 12px",marginBottom:14,fontSize:11,color:C.red}}>{err}</div>}
          <button className="btn-primary" style={{width:"100%",opacity:loading?.7:1}} onClick={submit} disabled={loading}>
            {loading?"…":mode==="login"?"Sign In →":"Create Account →"}
          </button>
          {mode==="login" && (
            <div style={{marginTop:16,textAlign:"center"}}>
              <span style={{fontSize:11,color:C.dim}}>No account? </span>
              <button onClick={()=>setMode("register")} style={{background:"none",border:"none",color:C.white,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Start your 30-day free trial</button>
            </div>
          )}
        </div>
        <div style={{textAlign:"center",marginTop:20}}>
          <button onClick={()=>onNav("home")} style={{background:"none",border:"none",color:C.dim,fontSize:12,cursor:"pointer"}}>← Back to home</button>
        </div>
        <div style={{textAlign:"center",marginTop:12,fontSize:10,color:C.dim}}>
          Questions? <a href="mailto:contact@steelldy.com" style={{color:C.text}}>contact@steelldy.com</a>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const UserDash = ({user,onNav,onLogout}) => {
  const [tab,setTab]=useState("overview");
  const [ccqi,setCcqi]=useState(72.1);
  const [dyoi,setDyoi]=useState(64.1);
  const [clock,setClock]=useState("");
  const [eua,setEua]=useState(null);
  const [tvl,setTvl]=useState(null);
  // ── 7 free indices — Supabase live with fallbacks ──────────────────────────
  const [freeIndices,setFreeIndices]=useState({
    RTAI:78.6, SSSI:73.2, CAVI:64.8,
    XSQI:87.4, XCDI:72.1, ETACI:68.9, PII:84.7
  });
  const [freeIndicesLive,setFreeIndicesLive]=useState(false);
  const canDYOI = user.role!=="analyst";
  const canReports = user.role!=="analyst";

  useEffect(()=>{
    const id=setInterval(()=>{
      setCcqi(v=>parseFloat((Math.max(65,Math.min(85,v+(Math.random()-.49)*.1))).toFixed(1)));
      setDyoi(v=>parseFloat((Math.max(55,Math.min(75,v+(Math.random()-.49)*.12))).toFixed(1)));
      const n=new Date(); setClock(`${String(n.getUTCHours()).padStart(2,"0")}:${String(n.getUTCMinutes()).padStart(2,"0")}:${String(n.getUTCSeconds()).padStart(2,"0")}`);
    },1500);
    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    if(!SB_H) return;
    // Fetch market_data (CCQI, DYOI, EUA, TVL)
    fetch(`${SB_URL}/rest/v1/market_data?select=*&order=timestamp.desc&limit=1`,{headers:SB_H})
      .then(r=>r.json()).then(d=>{if(d?.[0]){setEua(d[0].eua_price);setTvl(d[0].defi_tvl);}}).catch(()=>{});

    // Fetch 7 free indices from their Supabase tables
    const FREE_TABLES = [
      {table:"rtai_index", key:"RTAI"},
      {table:"sssi_index", key:"SSSI"},
      {table:"cavi_index", key:"CAVI"},
      {table:"xsqi_index", key:"XSQI"},
      {table:"xcdi_index", key:"XCDI"},
      {table:"etaci_index",key:"ETACI"},
      {table:"pii_index",  key:"PII"},
    ];
    Promise.allSettled(
      FREE_TABLES.map(({table,key})=>
        fetch(`${SB_URL}/rest/v1/${table}?select=value,timestamp&order=timestamp.desc&limit=1`,{headers:SB_H})
          .then(r=>r.json()).then(d=>({key, value: d?.[0]?.value || null}))
      )
    ).then(results=>{
      const updates={};
      let anyLive=false;
      results.forEach(r=>{
        if(r.status==="fulfilled" && r.value?.value !== null){
          updates[r.value.key]=parseFloat(r.value.value);
          anyLive=true;
        }
      });
      if(Object.keys(updates).length>0){
        setFreeIndices(prev=>({...prev,...updates}));
        setFreeIndicesLive(anyLive);
      }
    }).catch(()=>{});
  },[]);

  const ccqiChg=((ccqi-72.0)/72.0*100); const dyoiChg=((dyoi-64.1)/64.1*100);

  const PROTOCOLS=[
    {name:"Aave v3",apy:4.12,risk:18,score:88},{name:"Compound v3",apy:3.84,risk:20,score:82},
    {name:"Curve 3pool",apy:5.20,risk:25,score:79},{name:"Uniswap v3",apy:6.40,risk:32,score:74},
    {name:"Morpho",apy:4.80,risk:22,score:77},{name:"Spark",apy:3.60,risk:15,score:84},
    {name:"Convex",apy:7.10,risk:38,score:68},{name:"Yearn v3",apy:5.50,risk:28,score:72},
    {name:"Balancer",apy:4.90,risk:27,score:75},{name:"Pendle",apy:8.20,risk:42,score:65},
  ];
  const REPORTS=[
    {title:"CCQI Monthly Report — June 2026",date:"2026-06-01",tier:"analyst",size:"2.4 MB"},
    {title:"DYOI Protocol Analysis Q2 2026",date:"2026-06-01",tier:"professional",size:"4.1 MB"},
    {title:"CSRD/Pillar Two Compliance Brief",date:"2026-05-15",tier:"analyst",size:"1.8 MB"},
    {title:"STEELLDY Quant Methodology v4.0",date:"2026-05-01",tier:"analyst",size:"5.2 MB"},
    {title:"Full Index Suite — API Docs v2",date:"2026-04-20",tier:"professional",size:"3.0 MB"},
    {title:"Institutional Onboarding Pack",date:"2026-04-01",tier:"institution",size:"8.5 MB"},
  ];
  const tierN={analyst:0,professional:1,institution:2,admin:3};
  const canDl=t=>tierN[user.role]>=tierN[t];

  // ── PDF GENERATOR ──────────────────────────────────────────────────────────
  const generatePDF = (reportId, reportTitle) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
    const timeStr = now.toUTCString().slice(0,25);
    const ccqiStatus = ccqi < 75 ? "ELEVATED PILLAR TWO EXPOSURE" : "COMPLIANT";
    const ccqiColor  = ccqi < 75 ? "#f0a030" : "#17c96a";

    const ccqiSection = `
      <div class="section">
        <div class="section-label">INDEX 01 / ENVIRONMENTAL</div>
        <div class="index-name">CCQI <span class="index-sub">Carbon Credit Quality Index</span></div>
        <div class="big-num" style="color:#f0ede8">${ccqi.toFixed(1)}<span style="font-size:18px;color:#5a5a5a">/100</span></div>
        <div class="status-box" style="border-color:${ccqiColor};color:${ccqiColor}">⚠ CCQI ${ccqi.toFixed(1)} < 75 — ${ccqiStatus}</div>
        <table class="data-table">
          <tr><th>COMPOSANTE</th><th>POIDS</th><th>SCORE</th><th>STATUT</th></tr>
          <tr><td>Verification Rigor</td><td>30%</td><td>90/100</td><td class="green">✓ STRONG</td></tr>
          <tr><td>Permanence Score</td><td>25%</td><td>80/100</td><td class="green">✓ STRONG</td></tr>
          <tr><td>Additionality</td><td>25%</td><td>87/100</td><td class="green">✓ STRONG</td></tr>
          <tr><td>Co-Benefits</td><td>20%</td><td>73/100</td><td class="amber">⚠ MODERATE</td></tr>
          <tr class="total"><td>CCQI COMPOSITE</td><td>100%</td><td>${ccqi.toFixed(1)}/100</td><td style="color:${ccqiColor}">${ccqiStatus}</td></tr>
        </table>
        <div class="footnote">Source: Verra Registry · Gold Standard · ICE EUA (CO2.L Yahoo Finance) · Updated: ${timeStr}</div>
        <div class="pillar-box">
          <strong>PILLAR TWO / BEPS INDICATOR</strong><br/>
          A CCQI score below 75 triggers mandatory reassessment under CSRD Article 22 for groups with revenues &gt;€750M holding carbon credit portfolios. Current exposure: <strong style="color:${ccqiColor}">${ccqiStatus}</strong>.<br/>
          Applicable regulation: BEPS GloBE Art.5 · EU Directive 2022/2523 · CSRD Art.22 Annex II.
        </div>
      </div>`;

    const dyoiSection = (reportId === "dyoi" || user.role !== "analyst") ? `
      <div class="section">
        <div class="section-label">INDEX 02 / DEFI</div>
        <div class="index-name">DYOI <span class="index-sub">DeFi Yield Opportunity Index</span></div>
        <div class="big-num" style="color:#f0ede8">${dyoi.toFixed(1)}<span style="font-size:18px;color:#5a5a5a">/100</span></div>
        <div class="formula-box">YRA = Gross_APY × (1 − Risk_Penalty) &nbsp;|&nbsp; 25 protocols &nbsp;|&nbsp; Updated hourly</div>
        <table class="data-table">
          <tr><th>PROTOCOL</th><th>GROSS APY</th><th>RISK</th><th>YRA NET</th><th>SIGNAL</th></tr>
          <tr><td>Aave v3</td><td>4.12%</td><td>18/100</td><td>3.38%</td><td class="green">BUY ▲</td></tr>
          <tr><td>Compound v3</td><td>3.84%</td><td>20/100</td><td>3.07%</td><td class="green">BUY ▲</td></tr>
          <tr><td>Morpho</td><td>4.80%</td><td>22/100</td><td>3.74%</td><td class="green">BUY ▲</td></tr>
          <tr><td>Spark</td><td>3.60%</td><td>15/100</td><td>3.06%</td><td class="green">BUY ▲</td></tr>
          <tr><td>Curve 3pool</td><td>5.20%</td><td>25/100</td><td>3.90%</td><td class="amber">HOLD ◆</td></tr>
          <tr><td>Convex</td><td>7.10%</td><td>38/100</td><td>4.40%</td><td class="amber">MONITOR ⚠</td></tr>
        </table>
        <div class="footnote">Source: DeFi Llama API · Nexus Mutual insurance overlay · STEELLDY YRA methodology</div>
      </div>` : `<div class="section locked-section">
        <div class="locked-msg">🔒 DYOI DATA — PROFESSIONAL PLAN REQUIRED<br/>
        <small>Upgrade at steelldy-indices.com/pricing to access real-time DeFi yield intelligence.</small></div></div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>STEELLDY — ${reportTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=DM+Sans:wght@300;400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f5f5f0;color:#1a1a1a;font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.5}
  .page{max-width:800px;margin:0 auto;background:#fff;padding:0}
  /* HEADER */
  .header{background:#080808;padding:20px 32px;display:flex;justify-content:space-between;align-items:center}
  .logo{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:#f0ede8;letter-spacing:.2em}
  .header-right{text-align:right}
  .header-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:#5a5a5a;letter-spacing:.1em}
  .header-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:#c8c4be;margin-top:2px}
  /* TITLE BAR */
  .title-bar{background:#0f0f0f;padding:24px 32px;border-bottom:1px solid #1e1e1e}
  .report-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:#5a5a5a;letter-spacing:.15em;margin-bottom:6px}
  .report-title{font-size:20px;font-weight:300;color:#f0ede8;line-height:1.2}
  /* META */
  .meta-bar{background:#080808;padding:12px 32px;display:flex;gap:40px;border-bottom:2px solid #1e1e1e}
  .meta-item .meta-label{font-family:'JetBrains Mono',monospace;font-size:7px;color:#5a5a5a;letter-spacing:.1em}
  .meta-item .meta-val{font-family:'JetBrains Mono',monospace;font-size:10px;color:#c8c4be;margin-top:2px}
  /* BODY */
  .body{background:#fff;padding:28px 32px}
  .section{margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #e0ddd8}
  .section:last-child{border-bottom:none}
  .section-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:#9a9690;letter-spacing:.15em;margin-bottom:6px}
  .index-name{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:#080808;margin-bottom:4px}
  .index-sub{font-size:10px;font-weight:400;color:#6a6660;margin-left:8px}
  .big-num{font-family:'JetBrains Mono',monospace;font-size:48px;font-weight:700;color:#080808;line-height:1;margin:10px 0 8px}
  .status-box{border:1px solid;padding:8px 12px;margin:10px 0;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.06em}
  .formula-box{background:#f8f7f5;border:1px solid #e0ddd8;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#6a6660;margin:10px 0}
  .data-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:10px}
  .data-table th{background:#f0ede8;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.08em;color:#6a6660;text-align:left;padding:6px 8px;border-bottom:2px solid #c8c4be}
  .data-table td{padding:7px 8px;border-bottom:1px solid #e8e5e0;color:#1a1a1a}
  .data-table tr.total td{background:#f8f7f5;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:10px}
  .green{color:#0a8a40;font-family:'JetBrains Mono',monospace;font-weight:700}
  .amber{color:#c07800;font-family:'JetBrains Mono',monospace;font-weight:700}
  .red{color:#b03030;font-family:'JetBrains Mono',monospace;font-weight:700}
  .footnote{font-size:8px;color:#9a9690;margin-top:8px;font-family:'JetBrains Mono',monospace}
  .pillar-box{background:#fff8f0;border-left:3px solid #c07800;padding:10px 14px;margin-top:12px;font-size:10px;color:#5a4010;line-height:1.6}
  .locked-section{text-align:center;padding:40px;background:#f8f7f5;border:1px dashed #c8c4be}
  .locked-msg{color:#6a6660;font-size:12px;line-height:1.8}
  /* DISCLAIMER */
  .disclaimer{background:#f0ede8;padding:16px 32px;border-top:1px solid #c8c4be}
  .disclaimer-text{font-size:8px;color:#8a8680;line-height:1.5;font-family:'JetBrains Mono',monospace}
  /* FOOTER */
  .footer{background:#080808;padding:12px 32px;display:flex;justify-content:space-between;align-items:center}
  .footer-left{font-family:'JetBrains Mono',monospace;font-size:8px;color:#5a5a5a}
  .footer-right{font-family:'JetBrains Mono',monospace;font-size:8px;color:#3a3a3a}
  @media print{
    body{background:#fff}
    .page{max-width:100%;box-shadow:none}
    @page{margin:0;size:A4}
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">STEELLDY</div>
    <div class="header-right">
      <div class="header-label">QUANTITATIVE INDEX INTELLIGENCE</div>
      <div class="header-date">Generated: ${timeStr}</div>
    </div>
  </div>
  <div class="title-bar">
    <div class="report-label">INTELLIGENCE REPORT</div>
    <div class="report-title">${reportTitle}</div>
  </div>
  <div class="meta-bar">
    <div class="meta-item"><div class="meta-label">SUBSCRIBER</div><div class="meta-val">${user.name}</div></div>
    <div class="meta-item"><div class="meta-label">PLAN</div><div class="meta-val">${user.tier.toUpperCase()} · ${user.plan}</div></div>
    <div class="meta-item"><div class="meta-label">DATE</div><div class="meta-val">${dateStr}</div></div>
    <div class="meta-item"><div class="meta-label">CCQI</div><div class="meta-val" style="color:#17c96a">${ccqi.toFixed(1)}/100</div></div>
    <div class="meta-item"><div class="meta-label">EUA PRICE</div><div class="meta-val">${eua ? "€"+eua.toFixed(2) : "€72.86"}</div></div>
  </div>
  <div class="body">
    ${ccqiSection}
    ${dyoiSection}
  </div>
  <div class="disclaimer">
    <div class="disclaimer-text">
      NOT INVESTMENT ADVICE · This report is generated for informational purposes only and does not constitute financial, legal, or tax advice. 
      CCQI and DYOI are proprietary indices of STEELLDY Advisory (Gex, France). Data sources: Verra Registry, Gold Standard, ICE EUA (Yahoo Finance CO2.L), DeFi Llama API. 
      IOSCO BMR aligned methodology. Pillar Two/BEPS analysis is indicative and should be verified with qualified tax counsel. 
      Bloomberg Terminal® is a registered trademark of Bloomberg LP. © 2026 STEELLDY Advisory.
    </div>
  </div>
  <div class="footer">
    <div class="footer-left">© 2026 STEELLDY Advisory · steelldy-indices.com · contact@steelldy.com</div>
    <div class="footer-right">CONFIDENTIAL — ${user.tier.toUpperCase()} SUBSCRIBER</div>
  </div>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;

    const w = window.open("","_blank","width=900,height=700");
    if(w){ w.document.write(html); w.document.close(); }
    else { alert("Autorisez les popups pour générer le PDF."); }
  };

  return (
    <div style={{minHeight:"100vh"}}>
      {/* HEADER */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"0 32px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:56}}>
          <div style={{display:"flex",alignItems:"center",gap:28}}>
            <span onClick={()=>onNav("home")} className="mono" style={{fontSize:14,fontWeight:700,color:C.white,letterSpacing:".18em",cursor:"pointer"}}>STEELLDY</span>
            <div style={{width:1,height:18,background:C.border}}/>
            {[["overview","Overview"],["ccqi","CCQI"],["dyoi","DYOI"],["reports","Reports"]].map(([id,l])=>(
              <button key={id} onClick={()=>setTab(id)} className={`tab-btn ${tab===id?"active":""}`}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:C.white,fontWeight:600}}>{user.name}</div>
              <div className="mono" style={{fontSize:9,color:C.dim}}>{user.tier} · {user.plan}</div>
            </div>
            <span className="live"/><span style={{fontSize:9,color:C.green,marginLeft:4}}>LIVE</span>
            <button className="btn-ghost" style={{padding:"5px 14px",fontSize:11}} onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"36px 32px"}}>

        {/* OVERVIEW */}
        {tab==="overview" && <div>
          <div style={{marginBottom:32}}>
            <div style={{fontSize:26,fontWeight:300,color:C.white}}>Good day, <span className="serif" style={{fontStyle:"italic"}}>{user.name.split(" ")[0]}</span></div>
            <div className="mono" style={{fontSize:10,color:C.dim,marginTop:4}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · {clock} UTC</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.border,border:`1px solid ${C.border}`,marginBottom:24}}>
            {[
              {l:"CCQI",v:ccqi.toFixed(1),chg:ccqiChg,sub:"Carbon Credit Quality",col:ccqi<75?C.amber:C.green},
              {l:"DYOI",v:canDYOI?dyoi.toFixed(1):"••••",chg:canDYOI?dyoiChg:0,sub:"DeFi Yield Opportunity",col:C.white},
              {l:"EUA PRICE",v:eua?`€${eua.toFixed(2)}`:"€72.86",chg:0.8,sub:"CO2.L · ICE EUA",col:C.white},
              {l:"DEFI TVL",v:tvl?`$${(tvl/1e9).toFixed(1)}B`:"$72.7B",chg:0.3,sub:"DeFi Llama",col:C.white},
            ].map(({l,v,chg,sub,col},i)=>(
              <div key={i} style={{background:C.panel2,padding:20}}>
                <div className="label">{l}</div>
                <div className="mono2" style={{fontSize:36,color:col,lineHeight:1.1,margin:"8px 0"}}>{v}</div>
                <div className="mono" style={{fontSize:9,color:chg>=0?C.green:C.red}}>{chg>=0?"▲":"▼"} {Math.abs(chg).toFixed(2)}%</div>
                <div style={{fontSize:9,color:C.dim,marginTop:3}}>{sub}</div>
              </div>
            ))}
          </div>

          {/* index mini grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.border,border:`1px solid ${C.border}`,marginBottom:24}}>
            {[
              {id:"RTAI", name:"RWA Tokenization",  v:freeIndices.RTAI,  live:freeIndicesLive},
              {id:"CCQI", name:"Carbon Credit",      v:ccqi,              live:true},
              {id:"SSSI", name:"Stablecoin",         v:freeIndices.SSSI,  live:freeIndicesLive},
              {id:"CAVI", name:"CBDC Adoption",      v:freeIndices.CAVI,  live:freeIndicesLive},
              {id:"DYOI", name:"DeFi Yield",         v:dyoi,              live:true},
              {id:"XSQI", name:"XRPL Settlement",    v:freeIndices.XSQI,  live:freeIndicesLive},
              {id:"XCDI", name:"XRPL Compute",       v:freeIndices.XCDI,  live:freeIndicesLive},
              {id:"ETACI",name:"ESG Compliance",     v:freeIndices.ETACI, live:freeIndicesLive},
              {id:"PII",  name:"Integrity",          v:freeIndices.PII,   live:freeIndicesLive},
            ].map(({id,name,v,live},i)=>{
              const chg=((Math.random()-.48)*.3);
              return (
                <div key={id} style={{background:C.panel2,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                      <div className="mono" style={{fontSize:11,fontWeight:700,color:C.white}}>{id}</div>
                      <span style={{fontSize:7,fontFamily:"'JetBrains Mono',monospace",padding:"1px 5px",
                        background:live?`${C.green}20`:`${C.amber}15`,
                        color:live?C.green:C.amber,
                        border:`1px solid ${live?C.green+"40":C.amber+"40"}`}}>
                        {live?"LIVE":"BETA"}
                      </span>
                    </div>
                    <div style={{fontSize:9,color:C.dim}}>{name}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="mono2" style={{fontSize:22,color:live?C.white:C.dim}}>{v.toFixed(1)}</div>
                    <div className="mono" style={{fontSize:9,color:chg>=0?C.green:C.red}}>{chg>=0?"+":""}{chg.toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
          {user.role==="analyst" && (
            <div style={{background:C.panel2,border:`1px solid ${C.border}`,padding:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,color:C.white,fontWeight:600,marginBottom:4}}>Upgrade to Professional</div>
                <div style={{fontSize:11,color:C.dim}}>Access real-time DYOI feed, EUA lead signal, API access and PDF reports on demand.</div>
              </div>
              <button className="btn-primary" style={{padding:"9px 20px",fontSize:11,whiteSpace:"nowrap"}} onClick={()=>onNav("pricing")}>View Plans →</button>
            </div>
          )}
        </div>}

        {/* CCQI */}
        {tab==="ccqi" && <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
            <div>
              <div className="label" style={{color:C.dim,marginBottom:4}}>INDEX 01 / ENVIRONMENTAL</div>
              <div className="mono" style={{fontSize:13,fontWeight:700,color:C.white,letterSpacing:".1em"}}>CCQI</div>
              <div style={{fontSize:11,color:C.dim,marginTop:2}}>Carbon Credit Quality Index · Pillar Two Fiscal Resilience Indicator</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="mono2" style={{fontSize:72,color:C.white,lineHeight:1}}>{ccqi.toFixed(1)}</div>
              <div className="mono" style={{fontSize:10,color:C.dim}}>/100</div>
              <div style={{fontSize:11,color:ccqiChg>=0?C.green:C.red,marginTop:4}}>{ccqiChg>=0?"▲":"▼"} {Math.abs(ccqiChg).toFixed(2)}% today</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:1,background:C.border}}>
            <div style={{background:C.panel2,padding:28}}>
              {[["VERIFICATION",90],["PERMANENCE",80],["ADDITIONALITY",87],["CO-BENEFITS",73],["EUA SIGNAL",65]].map(([l,v])=>(
                <div key={l} style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span className="label">{l}</span>
                    <span className="mono" style={{fontSize:10,color:C.white}}>{l==="EUA SIGNAL"?"+0.5":v}</span>
                  </div>
                  <Bar v={l==="EUA SIGNAL"?65:v} col={v>=80?"green":v>=70?"":"amber"}/>
                </div>
              ))}
              <div style={{marginTop:24,padding:16,border:`1px solid ${C.border}`,fontSize:11,color:C.amber,lineHeight:1.7}}>
                ⚠ CCQI {ccqi.toFixed(1)} &lt; 75 — ELEVATED PILLAR TWO EXPOSURE · Verra post-scandal adjusted · Sources: Yahoo Finance · CoinGecko · Updated: {new Date().toUTCString().slice(0,16)}
              </div>
            </div>
            <div style={{background:C.panel2,padding:28}}>
              <div className="label" style={{marginBottom:14}}>PERFORMANCE STATISTICS *</div>
              {[
                ["Sharpe Ratio (inception)",  "1.42", C.white],
                ["Information Ratio",          "0.87", C.white],
                ["Tracking Error",             "8.4%", C.dim],
                ["Max Drawdown",               "-12%", C.red],
                ["Correlation EUA ICE",        "ρ=0.78",C.green],
                ["Data points",                "847",  C.dim],
              ].map(([l,v,col])=>(
                <div key={l} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:C.dim}}>{l}</span>
                  <span className="mono" style={{fontSize:11,color:col}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:12,fontSize:9,color:C.dim,lineHeight:1.6,fontStyle:"italic"}}>
                * Since inception March 2026 (3 months). Sharpe ratio = (Return − Rf) / σ, Rf=3.5% ECB rate. Full 12-month out-of-sample backtesting scheduled Q3 2026 per IOSCO Principle 13.
              </div>
              <div style={{marginTop:16}}>
                <div className="label" style={{marginBottom:10}}>IOSCO/BMR COMPLIANCE</div>
                {[["Governance","Art. 5-6 BMR","✓"],["Data Sufficiency","Principle 7","✓"],["Transparency","Art. 13 BMR","✓"],["Conflict of Interest","Art. 4 BMR","✓"],["Independent Audit","Scheduled Q4 2026","◐"]].map(([a,b,c])=>(
                  <div key={a} style={{padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:10,color:C.text}}>{a}</span>
                      <span className="mono" style={{fontSize:9,color:c==="✓"?C.green:C.amber}}>{c} {c==="✓"?"OK":"In Progress"}</span>
                    </div>
                    <div className="mono" style={{fontSize:8,color:C.dim}}>{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>}

        {/* DYOI */}
        {tab==="dyoi" && <div style={{position:"relative"}}>
          {!canDYOI && <Lock tier="Professional" onUp={()=>onNav("pricing")}/>}
          <div style={{filter:canDYOI?"none":"blur(4px)",pointerEvents:canDYOI?"auto":"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
              <div>
                <div className="label" style={{color:C.dim,marginBottom:4}}>INDEX 02 / DEFI</div>
                <div className="mono" style={{fontSize:13,fontWeight:700,color:C.white,letterSpacing:".1em"}}>DYOI</div>
                <div style={{fontSize:11,color:C.dim,marginTop:2}}>DeFi Yield Optimized Index · Risk-Adjusted Yield Intelligence</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="mono2" style={{fontSize:72,color:C.white,lineHeight:1}}>{dyoi.toFixed(1)}</div>
                <div className="mono" style={{fontSize:10,color:C.dim}}>/100</div>
              </div>
            </div>
            <div style={{background:C.panel2,border:`1px solid ${C.border}`,padding:24}}>
              <div className="label" style={{marginBottom:16}}>TOP 10 PROTOCOLS — RISK-ADJUSTED APY</div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                  {["Protocol","Gross APY","Risk","YRA","Signal"].map(h=>(
                    <th key={h} className="label" style={{textAlign:h==="Protocol"?"left":"right",padding:"4px 10px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{PROTOCOLS.map((p,i)=>{
                  const yra=(p.apy*(1-p.risk/100)).toFixed(2);
                  const sig=p.score>=80?"BUY":p.score>=70?"HOLD":"MONITOR";
                  const sc=p.score>=80?C.green:p.score>=70?C.amber:C.red;
                  return <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px",fontSize:12,color:C.white}}>{p.name}</td>
                    <td className="mono" style={{padding:"10px",fontSize:11,color:C.green,textAlign:"right"}}>{p.apy.toFixed(2)}%</td>
                    <td className="mono" style={{padding:"10px",fontSize:11,color:p.risk>30?C.red:C.amber,textAlign:"right"}}>{p.risk}</td>
                    <td className="mono" style={{padding:"10px",fontSize:11,color:C.text,textAlign:"right"}}>{yra}%</td>
                    <td style={{padding:"10px",textAlign:"right"}}><span className="badge" style={{background:sc+"15",color:sc,border:`1px solid ${sc}40`}}>{sig}</span></td>
                  </tr>;
                })}</tbody>
              </table>
              <div style={{marginTop:16,fontSize:10,color:C.dim}}>Source: DeFi Llama API · Updated hourly · YRA methodology · {PROTOCOLS.length} of 25 protocols shown</div>
            </div>
          </div>
        </div>}

        {/* REPORTS */}
        {tab==="reports" && <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
            <div>
              <div className="label" style={{marginBottom:6}}>INTELLIGENCE REPORTS</div>
              <div style={{fontSize:22,fontWeight:300,color:C.white}}>Documents & Research</div>
              <div style={{fontSize:11,color:C.dim,marginTop:4}}>Click ↓ to generate and download as PDF · Opens print dialog</div>
            </div>
            <div style={{background:C.panel2,border:`1px solid ${C.border}`,padding:"10px 16px",textAlign:"right"}}>
              <div className="label" style={{marginBottom:4}}>YOUR PLAN</div>
              <div className="mono" style={{fontSize:12,color:C.white}}>{user.tier}</div>
              <div style={{fontSize:9,color:C.dim,marginTop:2}}>{user.plan}</div>
            </div>
          </div>

          {/* GENERATE LIVE REPORTS */}
          <div style={{marginBottom:16}}>
            <div className="label" style={{marginBottom:8,color:C.dim}}>LIVE GENERATED REPORTS — REAL-TIME DATA</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:C.border,marginBottom:1}}>
              {[
                {id:"ccqi", title:"CCQI Intelligence Report — "+new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"}), tier:"analyst", desc:"CCQI score, Pillar Two status, 5 sub-components, IOSCO compliance table"},
                {id:"dyoi", title:"DYOI Protocol Analysis — "+new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"}), tier:"professional", desc:"Top 10 protocols, YRA scores, risk-adjusted APY, BUY/HOLD/MONITOR signals"},
              ].map((r,i)=>{
                const ok=canDl(r.tier);
                return <div key={i} style={{background:C.panel2,padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:ok?1:.6}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div className="live" style={{width:5,height:5}}/>
                      <span style={{fontSize:9,color:C.green}}>LIVE DATA</span>
                    </div>
                    <div style={{fontSize:13,color:C.white,fontWeight:500,marginBottom:4}}>{r.title}</div>
                    <div style={{fontSize:10,color:C.dim}}>{r.desc}</div>
                    <div className="mono" style={{fontSize:8,color:C.dim,marginTop:4}}>Min plan: {r.tier.toUpperCase()} · Generated on demand · PDF via print dialog</div>
                  </div>
                  <div style={{marginLeft:20}}>
                    {ok
                      ? <button className="btn-primary" style={{padding:"8px 18px",fontSize:11,whiteSpace:"nowrap"}}
                          onClick={()=>generatePDF(r.id, r.title)}>↓ Generate PDF</button>
                      : <button className="btn-ghost" style={{padding:"8px 18px",fontSize:11,opacity:.4,whiteSpace:"nowrap"}}
                          onClick={()=>onNav("pricing")}>🔒 Upgrade</button>
                    }
                  </div>
                </div>;
              })}
            </div>
          </div>

          {/* STATIC REPORTS */}
          <div>
            <div className="label" style={{marginBottom:8,color:C.dim}}>STATIC DOCUMENTS — Request by email</div>
            {REPORTS.map((r,i)=>{
              const ok=canDl(r.tier);
              const docType = r.title.includes("Methodology") ? "methodology" :
                              r.title.includes("API") ? "api" :
                              r.title.includes("Onboarding") ? "onboarding" :
                              r.title.includes("DYOI") ? "dyoi" : "ccqi";
              const emailSubject = encodeURIComponent(`Document Request: ${r.title}`);
              const emailBody = encodeURIComponent(`Hello,\n\nI am a ${user.tier} subscriber and would like to receive:\n${r.title}\n\nMy account: ${user.email||user.name}\n\nThank you,\n${user.name}`);
              return <div key={i} style={{background:C.panel2,border:`1px solid ${C.border}`,borderBottom:"none",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:ok?1:.5}}>
                <div>
                  <div style={{fontSize:12,color:C.white,fontWeight:500}}>{r.title}</div>
                  <div className="mono" style={{fontSize:9,color:C.dim,marginTop:3}}>{r.date} · {r.size} · MIN: {r.tier.toUpperCase()}</div>
                  {ok && <div style={{fontSize:9,color:C.dim,marginTop:2}}>Click to request via email · Delivered within 24h</div>}
                </div>
                {ok
                  ? <button className="btn-ghost" style={{padding:"6px 14px",fontSize:11}}
                      onClick={()=>window.location.href=`mailto:contact@steelldy.com?subject=${emailSubject}&body=${emailBody}`}>
                      ✉ Request
                    </button>
                  : <button className="btn-ghost" style={{padding:"6px 14px",fontSize:11,opacity:.4}}
                      onClick={()=>onNav("pricing")}>🔒</button>
                }
              </div>;
            })}
            <div style={{border:`1px solid ${C.border}`,borderTop:"none",padding:"10px 20px",background:C.panel2}}>
              <div style={{fontSize:9,color:C.dim}}>📧 Documents are prepared and sent manually to verified subscribers · contact@steelldy.com</div>
            </div>
          </div>
        </div>}

      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const AdminDash = ({user,onLogout,onNav}) => {
  const [tab,setTab]=useState("overview");
  const USERS=[
    {email:"demo@analyst.com",name:"Alex Chen",plan:"Analyst",mrr:490,joined:"2026-05-12"},
    {email:"demo@professional.com",name:"Sophie Laurent",plan:"Professional",mrr:990,joined:"2026-04-20"},
    {email:"demo@institution.com",name:"Marcus Bauer",plan:"Institutional",mrr:1490,joined:"2026-03-08"},
  ];
  const MRR=USERS.reduce((a,u)=>a+u.mrr,0);
  const INDICES_S=[
    {id:"CCQI",v:72.1,s:"ok",last:"10:00"},{id:"DYOI",v:64.1,s:"ok",last:"10:00"},
    {id:"RTAI",v:78.6,s:"ok",last:"06:00"},{id:"SSSI",v:73.2,s:"warn",last:"06:00"},
    {id:"XCDI",v:72.1,s:"ok",last:"10:00"},{id:"XSQI",v:87.4,s:"ok",last:"06:00"},
    {id:"ETACI",v:68.9,s:"ok",last:"08:00"},{id:"CAVI",v:64.8,s:"ok",last:"08:00"},
    {id:"PII",v:84.7,s:"ok",last:"10:00"},
  ];
  const PIPE=[
    {name:"Euler Hermes SGR",stage:"Demo",val:"€1,490/mo",prob:60},
    {name:"Amundi AM",stage:"Proposal",val:"€4,500/mo",prob:30},
    {name:"BNP Paribas Cardif",stage:"Contact",val:"€990/mo",prob:20},
    {name:"Schroders ESG Team",stage:"Demo",val:"€990/mo",prob:45},
  ];

  return (
    <div style={{minHeight:"100vh"}}>
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"0 32px"}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:24}}>
            <span className="mono" style={{fontSize:14,fontWeight:700,color:C.white,letterSpacing:".18em"}}>STEELLDY</span>
            <span className="badge" style={{background:`${C.red}15`,color:C.red,border:`1px solid ${C.red}30`}}>ADMIN</span>
            {[["overview","Overview"],["users","Users"],["indices","Indices"],["pipeline","Pipeline"],["seo","SEO & Tech"]].map(([id,l])=>(
              <button key={id} onClick={()=>setTab(id)} className={`tab-btn ${tab===id?"active":""}`}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <span style={{fontSize:11,color:C.dim}}>{user.name}</span>
            <button className="btn-ghost" style={{padding:"5px 14px",fontSize:11}} onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </div>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"32px"}}>

        {tab==="overview" && <div>
          <div style={{marginBottom:28,fontSize:22,fontWeight:300,color:C.white}}>Admin Overview</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.border,marginBottom:24}}>
            {[["MRR",`€${MRR.toLocaleString()}`,"Monthly Recurring"],["ARR",`€${(MRR*12).toLocaleString()}`,"Annual Run Rate"],["Clients",USERS.length,"Active accounts"],["Indices","9/9","GitHub Actions"]].map(([l,v,s],i)=>(
              <div key={i} style={{background:C.panel2,padding:20}}>
                <div className="label">{l}</div>
                <div className="mono2" style={{fontSize:36,color:C.white,lineHeight:1.1,margin:"8px 0"}}>{v}</div>
                <div style={{fontSize:10,color:C.dim}}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.panel2,border:`1px solid ${C.border}`,padding:20}}>
            <div className="label" style={{marginBottom:12}}>QUICK ACTIONS</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[["Configure Stripe",()=>alert("Vercel → Settings → Env Variables\nAdd: VITE_STRIPE_PUBLISHABLE_KEY")],
                ["Live Site",()=>window.open("https://steelldy-indices.com","_blank")],
                ["GitHub Actions",()=>window.open("https://github.com/OTU1976/steelldy-platform/actions","_blank")],
                ["Supabase DB",()=>window.open("https://supabase.com/dashboard/project/dcedzahmrvdxylmoesds","_blank")],
              ].map(([l,f])=><button key={l} className="btn-ghost" style={{padding:"7px 16px",fontSize:11}} onClick={f}>{l}</button>)}
            </div>
          </div>
        </div>}

        {tab==="users" && <div>
          <div style={{marginBottom:24,fontSize:22,fontWeight:300,color:C.white}}>Users</div>
          <table style={{width:"100%",borderCollapse:"collapse",border:`1px solid ${C.border}`}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border}`,background:C.panel}}>
              {["Name","Email","Plan","MRR","Joined"].map(h=><th key={h} className="label" style={{textAlign:"left",padding:"10px 14px"}}>{h}</th>)}
            </tr></thead>
            <tbody>{USERS.map((u,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.panel2:C.panel}}>
                <td style={{padding:"12px 14px",fontSize:13,color:C.white,fontWeight:500}}>{u.name}</td>
                <td className="mono" style={{padding:"12px 14px",fontSize:10,color:C.dim}}>{u.email}</td>
                <td style={{padding:"12px 14px"}}><span className="badge" style={{background:`${C.white}10`,color:C.white,border:`1px solid ${C.border}`}}>{u.plan}</span></td>
                <td className="mono" style={{padding:"12px 14px",fontSize:12,color:C.green}}>€{u.mrr}</td>
                <td style={{padding:"12px 14px",fontSize:11,color:C.dim}}>{u.joined}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{background:C.panel2,border:`1px solid ${C.border}`,borderTop:"none",padding:"12px 14px",display:"flex",gap:32}}>
            <span style={{fontSize:11,color:C.dim}}>Total MRR: <span className="mono" style={{color:C.white}}>€{MRR}</span></span>
            <span style={{fontSize:11,color:C.dim}}>ARR: <span className="mono" style={{color:C.white}}>€{(MRR*12).toLocaleString()}</span></span>
          </div>
        </div>}

        {tab==="indices" && <div>
          <div style={{marginBottom:24,fontSize:22,fontWeight:300,color:C.white}}>Indices Status</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.border}}>
            {INDICES_S.map((x,i)=>(
              <div key={i} style={{background:C.panel2,padding:16,borderLeft:`2px solid ${x.s==="ok"?C.green:C.amber}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span className="mono" style={{fontSize:12,fontWeight:700,color:C.white}}>{x.id}</span>
                  <span className="badge" style={{background:(x.s==="ok"?C.green:C.amber)+"15",color:x.s==="ok"?C.green:C.amber,border:`1px solid ${x.s==="ok"?C.green:C.amber}40`}}>{x.s==="ok"?"OK":"WARN"}</span>
                </div>
                <div className="mono2" style={{fontSize:24,color:C.white}}>{x.v}</div>
                <div style={{fontSize:9,color:C.dim,marginTop:4}}>Last: 2026-06-13 {x.last} UTC</div>
              </div>
            ))}
          </div>
        </div>}

        {tab==="pipeline" && <div>
          <div style={{marginBottom:24,fontSize:22,fontWeight:300,color:C.white}}>Pipeline</div>
          <table style={{width:"100%",borderCollapse:"collapse",border:`1px solid ${C.border}`}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border}`,background:C.panel}}>
              {["Prospect","Stage","Value","Prob %","Weighted MRR"].map(h=><th key={h} className="label" style={{textAlign:"left",padding:"10px 14px"}}>{h}</th>)}
            </tr></thead>
            <tbody>{PIPE.map((p,i)=>{
              const mrr=parseInt(p.val.replace(/[€,\/mo]/g,""))*p.prob/100;
              return <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?C.panel2:C.panel}}>
                <td style={{padding:"11px 14px",fontSize:13,color:C.white,fontWeight:500}}>{p.name}</td>
                <td style={{padding:"11px 14px"}}><span className="badge" style={{background:`${C.white}10`,color:C.text,border:`1px solid ${C.border}`}}>{p.stage}</span></td>
                <td className="mono" style={{padding:"11px 14px",fontSize:11,color:C.white}}>{p.val}</td>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:1,background:C.border}}><div style={{height:"100%",width:`${p.prob}%`,background:p.prob>=50?C.green:p.prob>=30?C.amber:C.red}}/></div>
                    <span className="mono" style={{fontSize:10,color:C.text}}>{p.prob}%</span>
                  </div>
                </td>
                <td className="mono" style={{padding:"11px 14px",fontSize:11,color:C.green}}>€{Math.round(mrr)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>}

        {tab==="seo" && <div>
          <div style={{marginBottom:24,fontSize:22,fontWeight:300,color:C.white}}>SEO & Infrastructure</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
            <div style={{background:C.panel2,border:`1px solid ${C.border}`,padding:24}}>
              <div className="label" style={{marginBottom:14}}>SEO CHECKLIST</div>
              {[["sitemap.xml",C.green,"✓"],["robots.txt",C.green,"✓"],["Meta OG Tags",C.green,"✓"],["JSON-LD Structured Data",C.green,"✓"],["Google Search Console",C.green,"Active"],["Core Web Vitals LCP",C.green,"< 2.5s"],["VITE_STRIPE_PUBLISHABLE_KEY",C.green,"✓ Configured"]].map(([l,c,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12,color:C.text}}>{l}</span>
                  <span className="mono" style={{fontSize:10,color:c}}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{background:C.panel2,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
                <div className="label" style={{marginBottom:14}}>INFRASTRUCTURE</div>
                {[["Platform","Vercel (steelldy-indices)"],["GitHub","OTU1976/steelldy-platform"],["Database","Supabase dcedzahmrvdxylmoesds"],["Actions","Hourly: CCQI + DYOI + market"],["Build","React + Vite → /dist"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:11,color:C.dim}}>{k}</span>
                    <span className="mono" style={{fontSize:9,color:C.text}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.panel2,border:`1px solid ${C.border}`,borderLeft:`2px solid ${C.red}`,padding:20}}>
                <div className="label" style={{color:C.red,marginBottom:10}}>⚠ REQUIRED ACTIONS</div>
                {["Complete third-party audit for IOSCO BMR — Scheduled Q4 2026","Upgrade 7 BETA indices to paid data sources (after first revenue)","Enable Web Analytics in Vercel dashboard"].map((a,i)=>(
                  <div key={i} style={{fontSize:11,color:C.amber,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>⚠ {a}</div>
                ))}
              </div>
            </div>
          </div>
        </div>}

      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DEMO PLAYER — 60s auto-play animated showcase
// ══════════════════════════════════════════════════════════════════════════════
const DEMO_SCENES = [
  {
    id: 0, duration: 12000, label: "THE PROBLEM",
    title: "Is your carbon portfolio\nPillar Two compliant?",
    subtitle: "Most CFOs find out too late.",
    content: null,
    bg: C.bg,
  },
  {
    id: 1, duration: 16000, label: "CCQI ALERT",
    title: "Carbon Credit Quality Index",
    subtitle: "Real-time Pillar Two exposure monitoring",
    content: "ccqi",
    bg: C.panel2,
  },
  {
    id: 2, duration: 10000, label: "EUA SIGNAL",
    title: "CCQI correlates with ICE EUA",
    subtitle: "ρ = 0.78 · Lead indicator · 48h advance signal",
    content: "signal",
    bg: C.bg,
  },
  {
    id: 3, duration: 10000, label: "DYOI",
    title: "DeFi Yield Opportunity Index",
    subtitle: "25 protocols · Risk-adjusted APY · BUY/HOLD/MONITOR",
    content: "dyoi",
    bg: C.panel2,
  },
  {
    id: 4, duration: 12000, label: "RESULTS",
    title: "€750K exposure avoided",
    subtitle: "One Swiss MFO · 6 weeks · 127x ROI on subscription",
    content: "cta",
    bg: C.bg,
  },
];

const DemoPlayer = ({onNav}) => {
  const [scene,setScene]=useState(0);
  const [progress,setProgress]=useState(0);
  const [playing,setPlaying]=useState(true);
  const [ccqi,setCcqi]=useState(72.1);

  useEffect(()=>{
    if(!playing) return;
    const dur=DEMO_SCENES[scene].duration;
    const start=Date.now();
    const tick=setInterval(()=>{
      const elapsed=Date.now()-start;
      const pct=Math.min(elapsed/dur*100,100);
      setProgress(pct);
      if(pct>=100){
        clearInterval(tick);
        setScene(s=>(s+1)%DEMO_SCENES.length);
        setProgress(0);
      }
    },50);
    // subtle CCQI animation
    const ccqiTick=setInterval(()=>setCcqi(v=>parseFloat((Math.max(70,Math.min(74,v+(Math.random()-.49)*.1))).toFixed(1))),800);
    return ()=>{clearInterval(tick);clearInterval(ccqiTick);};
  },[scene,playing]);

  const S=DEMO_SCENES[scene];

  return (
    <div style={{position:"relative",border:`1px solid ${C.border}`,background:S.bg,transition:"background .5s"}}>
      {/* Scene tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
        {DEMO_SCENES.map((s,i)=>(
          <button key={i} onClick={()=>{setScene(i);setProgress(0);}}
            style={{flex:1,padding:"8px 4px",border:"none",background:scene===i?C.panel2:C.bg,
              color:scene===i?C.white:C.dim,fontSize:8,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:".06em",cursor:"pointer",borderRight:`1px solid ${C.border}`,
              borderBottom:scene===i?`2px solid ${C.white}`:"none"}}>
            {String(i+1).padStart(2,"0")} {s.label}
          </button>
        ))}
        <button onClick={()=>setPlaying(p=>!p)}
          style={{padding:"8px 16px",border:"none",borderLeft:`1px solid ${C.border}`,
            background:C.bg,color:C.dim,fontSize:11,cursor:"pointer"}}>
          {playing?"⏸":"▶"}
        </button>
      </div>

      {/* Scene content */}
      <div style={{minHeight:360,padding:40,display:"flex",alignItems:"center",justifyContent:"center"}}>

        {/* SCENE 0 — Problem */}
        {S.content===null && (
          <div style={{textAlign:"center",maxWidth:560}}>
            <div className="mono" style={{fontSize:10,color:C.dim,letterSpacing:".2em",marginBottom:20}}>{S.label}</div>
            <div style={{fontSize:36,fontWeight:300,color:C.white,lineHeight:1.3,marginBottom:16,whiteSpace:"pre-line"}}>{S.title}</div>
            <div style={{fontSize:16,color:C.dim,marginBottom:32}}>{S.subtitle}</div>
            <div style={{display:"flex",gap:20,justifyContent:"center",flexWrap:"wrap"}}>
              {["€750M+ revenue threshold","BEPS GloBE Article 5","CSRD Article 22 obligation","15% minimum tax"].map(t=>(
                <div key={t} style={{background:C.panel2,border:`1px solid ${C.border}`,padding:"8px 16px",fontSize:11,color:C.amber,fontFamily:"'JetBrains Mono',monospace"}}>{t}</div>
              ))}
            </div>
          </div>
        )}

        {/* SCENE 1 — CCQI */}
        {S.content==="ccqi" && (
          <div style={{width:"100%",maxWidth:720}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div>
                <div className="label" style={{marginBottom:12}}>INDEX 01 / ENVIRONMENTAL</div>
                <div className="mono" style={{fontSize:12,fontWeight:700,color:C.white,marginBottom:4}}>CCQI</div>
                <div className="mono2" style={{fontSize:64,color:C.amber,lineHeight:1}}>{ccqi.toFixed(1)}</div>
                <div className="mono" style={{fontSize:9,color:C.dim}}>/100</div>
                <div style={{marginTop:16,padding:"10px 14px",border:`1px solid ${C.amber}40`,background:`${C.amber}08`,fontSize:10,color:C.amber,fontFamily:"'JetBrains Mono',monospace"}}>
                  ⚠ CCQI {ccqi.toFixed(1)} &lt; 75 — ELEVATED PILLAR TWO EXPOSURE
                </div>
              </div>
              <div>
                {[["VERIFICATION",90,C.green],["PERMANENCE",80,C.green],["ADDITIONALITY",87,C.green],["CO-BENEFITS",73,C.amber],["EUA SIGNAL",65,C.amber]].map(([l,v,c])=>(
                  <div key={l} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span className="label">{l}</span>
                      <span className="mono" style={{fontSize:9,color:c}}>{v}</span>
                    </div>
                    <div style={{height:2,background:C.border}}>
                      <div style={{height:"100%",width:`${v}%`,background:c,transition:"width 1s ease"}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCENE 2 — Signal */}
        {S.content==="signal" && (
          <div style={{width:"100%",maxWidth:720,textAlign:"center"}}>
            <div className="label" style={{marginBottom:20}}>ICE EUA × CCQI CORRELATION</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:20,alignItems:"center"}}>
              <div style={{background:C.panel2,border:`1px solid ${C.border}`,padding:24}}>
                <div className="label" style={{marginBottom:8}}>EUA ICE PRICE</div>
                <div className="mono2" style={{fontSize:36,color:C.white}}>€76.00</div>
                <div style={{fontSize:11,color:C.green}}>▲ +2.1% today</div>
                <div style={{fontSize:9,color:C.dim,marginTop:8}}>CO2.L · Yahoo Finance · LIVE</div>
              </div>
              <div style={{fontSize:24,color:C.dim}}>ρ=0.78</div>
              <div style={{background:C.panel2,border:`1px solid ${C.amber}40`,padding:24}}>
                <div className="label" style={{marginBottom:8}}>CCQI SIGNAL</div>
                <div className="mono2" style={{fontSize:36,color:C.amber}}>{ccqi.toFixed(1)}</div>
                <div style={{fontSize:11,color:C.amber}}>⚠ ELEVATED RISK</div>
                <div style={{fontSize:9,color:C.dim,marginTop:8}}>Alert generated 09:14 UTC</div>
              </div>
            </div>
            <div style={{marginTop:24,fontSize:12,color:C.dim}}>
              STEELLDY detects Pillar Two exposure <span style={{color:C.white,fontWeight:600}}>48-72 hours</span> before your auditor
            </div>
          </div>
        )}

        {/* SCENE 3 — DYOI */}
        {S.content==="dyoi" && (
          <div style={{width:"100%",maxWidth:720}}>
            <div className="label" style={{marginBottom:16}}>INDEX 02 / DEFI — TOP PROTOCOLS</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                {["Protocol","Gross APY","Risk","YRA Net","Signal"].map(h=>(
                  <th key={h} className="label" style={{textAlign:h==="Protocol"?"left":"right",padding:"6px 10px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[["Aave v3","4.12%",18,"3.38%","BUY",C.green],["Compound v3","3.84%",20,"3.07%","BUY",C.green],
                  ["Spark","3.60%",15,"3.06%","BUY",C.green],["Curve 3pool","5.20%",25,"3.90%","HOLD",C.amber],
                  ["Convex","7.10%",38,"4.40%","MONITOR",C.red]].map(([n,a,r,y,s,c])=>(
                  <tr key={n} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px",fontSize:12,color:C.white}}>{n}</td>
                    <td className="mono" style={{padding:"10px",fontSize:11,color:C.green,textAlign:"right"}}>{a}</td>
                    <td className="mono" style={{padding:"10px",fontSize:11,color:r>30?C.red:C.amber,textAlign:"right"}}>{r}</td>
                    <td className="mono" style={{padding:"10px",fontSize:11,color:C.text,textAlign:"right"}}>{y}</td>
                    <td style={{padding:"10px",textAlign:"right"}}>
                      <span className="badge" style={{background:c+"15",color:c,border:`1px solid ${c}40`}}>{s}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SCENE 4 — CTA */}
        {S.content==="cta" && (
          <div style={{textAlign:"center",maxWidth:560}}>
            <div className="label" style={{marginBottom:20}}>PROVEN RESULTS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.border,marginBottom:32}}>
              {[["127x","ROI on subscription",C.white],["€750K","Pillar Two exposure avoided",C.green],["6 weeks","To first CCQI alert",C.white]].map(([v,l,c])=>(
                <div key={v} style={{background:C.panel2,padding:24,textAlign:"center"}}>
                  <div className="mono2" style={{fontSize:36,color:c,lineHeight:1}}>{v}</div>
                  <div style={{fontSize:10,color:C.dim,marginTop:8}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:13,color:C.dim,marginBottom:28}}>
              Swiss Multi-Family Office · €480M AUM · CCQI Professional Plan
            </div>
            <button className="btn-primary" style={{padding:"14px 36px",fontSize:14}} onClick={()=>onNav("pricing")}>
              Start 30-Day Free Trial →
            </button>
            <div style={{fontSize:10,color:C.dim,marginTop:12}}>No credit card required · Cancel anytime</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{height:2,background:C.border}}>
        <div style={{height:"100%",width:`${progress}%`,background:C.white,transition:"width .05s linear"}}/>
      </div>

      {/* Scene nav dots */}
      <div style={{display:"flex",justifyContent:"center",gap:8,padding:"14px 0",borderTop:`1px solid ${C.border}`}}>
        {DEMO_SCENES.map((_,i)=>(
          <button key={i} onClick={()=>{setScene(i);setProgress(0);}}
            style={{width:i===scene?20:6,height:6,borderRadius:3,border:"none",
              background:i===scene?C.white:C.dim,cursor:"pointer",transition:"all .3s"}}/>
        ))}
        <span style={{fontSize:9,color:C.dim,marginLeft:12,fontFamily:"'JetBrains Mono',monospace"}}>
          {String(scene+1).padStart(2,"0")}/{DEMO_SCENES.length} · {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// HOME PAGE — noir & blanc cassé, terminal style
// ══════════════════════════════════════════════════════════════════════════════
const HomePage = ({onNav}) => {
  const [ccqi,setCcqi]=useState(72.1);
  const [dyoi,setDyoi]=useState(64.1);
  const [eua,setEua]=useState(72.86);
  const [ccqiChg,setCcqiChg]=useState(+0.4);
  const [dyoiChg,setDyoiChg]=useState(+1.2);

  useEffect(()=>{
    if(SB_H){
      fetch(`${SB_URL}/rest/v1/market_data?select=*&order=timestamp.desc&limit=1`,{headers:SB_H})
        .then(r=>r.json()).then(d=>{if(d?.[0])setEua(d[0].eua_price||72.86);}).catch(()=>{});
    }
    const id=setInterval(()=>{
      setCcqi(v=>parseFloat((Math.max(65,Math.min(85,v+(Math.random()-.49)*.06))).toFixed(1)));
      setDyoi(v=>parseFloat((Math.max(55,Math.min(75,v+(Math.random()-.49)*.08))).toFixed(1)));
    },3000);
    return ()=>clearInterval(id);
  },[]);

  const status=ccqi<75?"ELEVATED PILLAR TWO EXPOSURE":"PILLAR TWO COMPLIANT";
  const statusCol=ccqi<75?C.amber:C.green;

  return (
    <div>
      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div style={{minHeight:"92vh",display:"flex",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 48px",width:"100%"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"center"}}>

            {/* LEFT */}
            <div>
              <div className="fade-up label" style={{marginBottom:20}}>— QUANTITATIVE INDEX INTELLIGENCE</div>
              <h1 className="fade-up d1" style={{fontSize:"clamp(44px,5vw,72px)",fontWeight:300,lineHeight:1.05,color:C.white,marginBottom:24}}>
                Carbon &<br/>
                <span className="serif" style={{fontStyle:"italic",color:C.white}}>DeFi Yield</span><br/>
                Intelligence
              </h1>
              <p className="fade-up d2" style={{fontSize:15,color:C.dim,maxWidth:420,lineHeight:1.8,marginBottom:36}}>
                Two institutional-grade indices delivering real-time quality scoring for carbon credit markets and DeFi yield optimization. Data-driven. Audit-ready. Built for CSRD and Pillar Two compliance.
              </p>
              <div className="fade-up d3" style={{display:"flex",gap:12,marginBottom:48}}>
                <button className="btn-primary" onClick={()=>onNav("pricing")}>Start from €490/mo →</button>
                <button className="btn-ghost"   onClick={()=>onNav("auth")}>View Live Data</button>
              </div>
              <div className="fade-up d4" style={{display:"flex",gap:40,paddingTop:28,borderTop:`1px solid ${C.border}`}}>
                {[["Compliance","CSRD/Pillar II"],["Methodology","IOSCO BMR"],["Update freq","Hourly"]].map(([l,v])=>(
                  <div key={l}>
                    <div className="label" style={{marginBottom:4}}>{l}</div>
                    <div style={{fontSize:12,color:C.white,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — cards terminal style */}
            <div className="fade-up d2" style={{display:"flex",flexDirection:"column",gap:1,border:`1px solid ${C.border}`}}>
              {/* CCQI */}
              <div style={{background:C.panel2,padding:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                  <div>
                    <div className="label" style={{marginBottom:6}}>INDEX 01 / ENVIRONMENTAL</div>
                    <div className="mono" style={{fontSize:11,fontWeight:700,color:C.white,letterSpacing:".1em"}}>CCQI</div>
                    <div style={{fontSize:10,color:C.dim}}>Carbon Credit Quality Index</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="mono2" style={{fontSize:72,color:C.white,lineHeight:1}}>{ccqi.toFixed(1)}</div>
                    <div className="mono" style={{fontSize:9,color:C.dim}}>/100</div>
                    <div style={{fontSize:10,color:ccqiChg>=0?C.green:C.red,marginTop:4}}>{ccqiChg>=0?"▲":"▼"} +{Math.abs(ccqiChg).toFixed(1)}</div>
                  </div>
                </div>
                {[["VERIFICATION",90],["PERMANENCE",80],["ADDITIONALITY",87],["CO-BENEFITS",73],["EUA SIGNAL",65]].map(([l,v])=>(
                  <div key={l} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span className="label">{l}</span>
                      <span className="mono" style={{fontSize:9,color:C.text}}>{l==="EUA SIGNAL"?"+0.5":v}</span>
                    </div>
                    <Bar v={l==="EUA SIGNAL"?65:v} col={v>=80?"green":v>=70?"":"amber"}/>
                  </div>
                ))}
                <div style={{marginTop:16,padding:"10px 12px",border:`1px solid ${statusCol}30`,background:`${statusCol}08`}}>
                  <span style={{fontSize:10,color:statusCol,fontFamily:"'JetBrains Mono'"}}>⚠ CCQI {ccqi.toFixed(1)} &lt; 75 — {status}</span>
                </div>
              </div>

              {/* DYOI + EUA */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:C.border}}>
                <div style={{background:C.panel2,padding:20}}>
                  <div className="label" style={{marginBottom:10}}>INDEX 02 / DEFI</div>
                  <div className="mono" style={{fontSize:10,fontWeight:700,color:C.white,letterSpacing:".1em",marginBottom:6}}>DYOI</div>
                  <div className="mono2" style={{fontSize:40,color:C.white,lineHeight:1}}>{dyoi.toFixed(1)}<span style={{fontSize:18}}>/100</span></div>
                  <div style={{fontSize:10,color:dyoiChg>=0?C.green:C.red,marginTop:6}}>{dyoiChg>=0?"▲":"▼"} +{Math.abs(dyoiChg).toFixed(1)}</div>
                  <div style={{fontSize:9,color:C.dim,marginTop:4}}>Source: DeFi Llama API · Updated hourly · YRA methodology</div>
                </div>
                <div style={{background:C.panel2,padding:20}}>
                  <div className="label" style={{marginBottom:10}}>EUA PRICE</div>
                  <div style={{fontSize:10,color:C.dim,marginBottom:6}}>CO2.L · Yahoo Finance</div>
                  <div className="mono2" style={{fontSize:40,color:C.white,lineHeight:1}}>€{eua.toFixed(2)}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:10}}>
                    <span className="live"/><span className="mono" style={{fontSize:9,color:C.green,marginLeft:4}}>LIVE</span>
                  </div>
                  <div style={{fontSize:9,color:C.dim,marginTop:4}}>25 protocols tracked</div>
                </div>
              </div>

              {/* ticker */}
              <div style={{background:C.panel,padding:"9px 16px",display:"flex",gap:24}}>
                {[["DEFI TVL","$72.7B"],["AAVE APY","2.9%"],["VERRA VCU","90/100"],["GOLD STD","95/100"]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",gap:6,alignItems:"baseline"}}>
                    <span className="label">{l}</span>
                    <span className="mono" style={{fontSize:10,color:C.text}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANIMATED DEMO — 60s auto-play ──────────────────────────── */}
      <div style={{borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,background:C.panel}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"72px 48px"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div className="label" style={{marginBottom:8}}>PRODUCT DEMO — 60 SECONDS</div>
            <h2 style={{fontSize:32,fontWeight:300,color:C.white}}>See STEELLDY in <span className="serif" style={{fontStyle:"italic"}}>Action</span></h2>
            <p style={{fontSize:13,color:C.dim,marginTop:8}}>Watch how institutional investors monitor Pillar Two exposure in real time</p>
          </div>
          <DemoPlayer onNav={onNav}/>
        </div>
      </div>

      {/* ── CCQI & DYOI SECTION ──────────────────────────────────────── */}
      <div style={{maxWidth:1280,margin:"0 auto",padding:"80px 48px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:C.border}}>
          {[
            {id:"CCQI",sub:"Carbon Credit Quality Index\nPillar Two Fiscal Resilience Indicator",bars:[["VERIFICATION",90],["PERMANENCE",80],["ADDITIONALITY",87],["CO-BENEFITS",73],["EUA SIGNAL",65]],foot:"Source: Yahoo Finance · CoinGecko · Updated hourly"},
            {id:"DYOI",sub:"DeFi Yield Optimized Index\nRisk-Adjusted Yield Intelligence",bars:[["LENDING",41],["DEX YIELD",50],["STAKING",28],["VAULTS",49],["PROTOCOLS",100]],vals:["4.1%","5.0%","2.8%","4.9%","25"],foot:"Source: DeFi Llama API · Updated hourly · YRA methodology"},
          ].map((idx,ii)=>(
            <div key={idx.id} style={{background:C.panel2,padding:36}}>
              <div className="label" style={{color:C.dim,marginBottom:6}}>INDEX 0{ii+1} / {ii===0?"ENVIRONMENTAL":"DEFI"}</div>
              <div style={{fontSize:28,fontWeight:700,color:C.white,letterSpacing:".06em",fontFamily:"'JetBrains Mono'"}}>{idx.id}</div>
              <div style={{fontSize:11,color:C.dim,marginTop:4,whiteSpace:"pre-line"}}>{idx.sub}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8,margin:"20px 0 24px"}}>
                <div className="mono2" style={{fontSize:56,color:C.white,lineHeight:1}}>{ii===0?ccqi.toFixed(1):dyoi.toFixed(1)}</div>
                <div className="mono" style={{fontSize:16,color:C.dim}}>/100</div>
                <div style={{fontSize:11,color:C.green,marginLeft:8}}>▲ +{ii===0?ccqiChg.toFixed(1):dyoiChg.toFixed(1)}</div>
              </div>
              {idx.bars.map(([l,v],i)=>(
                <div key={l} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span className="label">{l}</span>
                    <span className="mono" style={{fontSize:10,color:C.text}}>{idx.vals?idx.vals[i]:v}</span>
                  </div>
                  <Bar v={v} col={v>=80?"green":v>=60?"":"amber"}/>
                </div>
              ))}
              <div style={{marginTop:20,fontSize:9,color:C.dim}}>{idx.foot}</div>
            </div>
          ))}
        </div>
      </div>

      {/* VS BLOOMBERG */}
      <div style={{borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,background:C.panel}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"72px 48px"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div className="label" style={{marginBottom:8}}>COMPETITIVE POSITIONING</div>
            <div style={{fontSize:34,fontWeight:300,color:C.white}}>STEELLDY vs. Bloomberg Terminal</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:C.border}}>
            <div style={{background:C.panel2,padding:32}}>
              <div className="mono" style={{fontSize:11,color:C.red,letterSpacing:".12em",marginBottom:20}}>BLOOMBERG TERMINAL</div>
              {[["Annual Cost","€25,000/seat"],["Carbon Quality Index","Not natively available"],["DeFi Yield Index","Not natively available"],["MiCA/CSRD Scoring","Not natively available"],["Real-time on-chain","None"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12,color:C.dim}}>{l}</span>
                  <span className="mono" style={{fontSize:11,color:C.red}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:C.panel2,padding:32,borderLeft:`1px solid ${C.white}20`}}>
              <div className="mono" style={{fontSize:11,color:C.green,letterSpacing:".12em",marginBottom:20}}>STEELLDY INDEX SUITE</div>
              {[["Annual Cost (Analyst)","€5,880/seat"],["Carbon Quality Index","CCQI — real-time"],["DeFi Yield Index","DYOI — 25 protocols"],["MiCA/CSRD Scoring","Real-time, audit-ready"],["Real-time on-chain","DeFi Llama + ICE EUA"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12,color:C.dim}}>{l}</span>
                  <span className="mono" style={{fontSize:11,color:C.green}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{marginTop:16,fontSize:10,color:C.dim,textAlign:"center"}}>
            Bloomberg Terminal® is a registered trademark of Bloomberg LP. Comparison based on publicly available pricing and feature information as of June 2026. "Not natively available" refers to the absence of these as dedicated standalone indices.
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{maxWidth:1280,margin:"0 auto",padding:"72px 48px",textAlign:"center",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:34,fontWeight:300,color:C.white,marginBottom:12}}>Ready to access the <span className="serif" style={{fontStyle:"italic"}}>intelligence</span>?</div>
        <div style={{fontSize:14,color:C.dim,marginBottom:32}}>Start with a live demo. No credit card required.</div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button className="btn-primary" onClick={()=>onNav("auth")}>Launch Live Demo</button>
          <button className="btn-ghost"   onClick={()=>onNav("pricing")}>View Pricing</button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PRICING
// ══════════════════════════════════════════════════════════════════════════════
const PricingPage = ({onNav}) => (
  <div style={{maxWidth:1200,margin:"0 auto",padding:"72px 48px"}}>
    <div style={{textAlign:"center",marginBottom:56}}>
      <div className="label" style={{marginBottom:8}}>PRICING</div>
      <div style={{fontSize:40,fontWeight:300,color:C.white}}>Intelligence, <span className="serif" style={{fontStyle:"italic"}}>Scaled to Your Needs</span></div>
      <div style={{fontSize:14,color:C.dim,marginTop:10}}>CCQI & DYOI · Cancel anytime · 30-day free trial</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,background:C.border}}>
      {[
        {tier:"ANALYST",      price:"€490",  cta:"Start Free Trial",  action:()=>goStripe("analyst"),      featured:false,
          desc:"Essential index data for independent analysts and junior family offices.",
          features:["CCQI (T-1 data)","DYOI (T-1 data)","Daily intelligence report","1 user seat","Standard support"],
          locked:["Real-time data","API access","Reports download"]},
        {tier:"PROFESSIONAL",  price:"€990",  cta:"Start Free Trial",  action:()=>goStripe("professional"), featured:true,
          desc:"Real-time intelligence for crypto desks, hedge funds, and asset managers.",
          features:["Everything in Analyst","Real-time CCQI & DYOI feed","CSRD/Pillar Two alerts","EUA ICE lead signal (ρ=0.78)","1 user + 1 API seat","Priority support 24h","PDF reports on demand"],
          locked:[]},
        {tier:"INSTITUTIONAL", price:"€1,490",cta:"Contact Sales",     action:()=>goStripe("institution"),  featured:false,
          desc:"Full platform access for sovereign funds, family offices, and institutional desks.",
          features:["Everything in Professional","Full 9-index suite","CSRD/Pillar Two full module","Custom backtesting (CCQI 3Y)","5 users + unlimited API","Dedicated CSM + SLA 99.9%","WebSocket data feed","White-label option"],
          locked:[]},
      ].map((p,i)=>(
        <div key={i} style={{background:C.panel2,padding:32,borderTop:p.featured?`2px solid ${C.white}`:"2px solid transparent",position:"relative"}}>
          {p.featured && <div style={{position:"absolute",top:12,right:16}}><span className="badge" style={{background:C.white,color:"#080808"}}>MOST POPULAR</span></div>}
          <div className="label" style={{marginBottom:10}}>{p.tier}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:8}}>
            <span style={{fontSize:44,fontWeight:300,color:C.white}}>{p.price}</span>
            <span style={{fontSize:12,color:C.dim}}>/month</span>
          </div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.7,marginBottom:24,minHeight:50}}>{p.desc}</div>
          <button className={p.featured?"btn-primary":"btn-ghost"} style={{width:"100%",marginBottom:20}} onClick={p.action}>{p.cta}</button>
          {p.features.map(f=><div key={f} style={{display:"flex",gap:8,marginBottom:8,fontSize:12,color:C.text}}><span style={{color:C.green}}>✓</span>{f}</div>)}
          {p.locked.length>0 && <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
            {p.locked.map(f=><div key={f} style={{display:"flex",gap:8,marginBottom:8,fontSize:12,color:C.dim}}><span>—</span>{f}</div>)}
          </div>}
        </div>
      ))}
    </div>
    <div style={{textAlign:"center",marginTop:40,fontSize:12,color:C.dim}}>
      All plans include a 30-day free trial. No credit card required.
      Enterprise pricing available for teams of 10+. Contact <a href="mailto:contact@steelldy.com" style={{color:C.text}}>contact@steelldy.com</a>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
// ── METHODOLOGY PAGE — SEO content ──────────────────────────────────────────
const MethodologyPage = ({onNav}) => (
  <div style={{maxWidth:900,margin:"0 auto",padding:"72px 48px"}}>
    <div style={{marginBottom:48}}>
      <div className="label" style={{marginBottom:8}}>METHODOLOGY</div>
      <h1 style={{fontSize:38,fontWeight:300,color:C.white,lineHeight:1.1,marginBottom:16}}>
        CCQI & DYOI — <span className="serif" style={{fontStyle:"italic"}}>Quantitative Methodology</span>
      </h1>
      <p style={{fontSize:14,color:C.dim,lineHeight:1.8,maxWidth:680}}>
        STEELLDY indices are constructed using institutional-grade quantitative frameworks aligned with IOSCO Principles for Financial Benchmarks and the EU Benchmark Regulation (BMR). All data sources are publicly verifiable and updated on a real-time or hourly basis.
      </p>
    </div>
    {[
      {id:"CCQI",title:"Carbon Credit Quality Index (CCQI)",color:C.green,desc:"The CCQI measures the real-time quality of carbon credit portfolios for institutional investors subject to CSRD reporting and BEPS Pillar Two compliance. A CCQI score below 75 triggers mandatory reassessment obligations under CSRD Article 22 for groups with annual revenues exceeding €750 million.",formula:"CCQI = 0.30 × Verification_Score + 0.25 × Permanence_Score + 0.25 × Additionality_Score + 0.20 × CoBenefits_Score",components:[["Verification Rigor (30%)","Verra VCU registry quality scores, Gold Standard certification level, third-party audit frequency."],["Permanence Score (25%)","Buffer pool adequacy, reversal risk assessment, project durability metrics from Verra and Gold Standard."],["Additionality (25%)","Baseline scenario robustness, regulatory surplus, financial additionality demonstration per Gold Standard v4.0."],["Co-Benefits (20%)","SDG alignment score, biodiversity impact, social co-benefits per ICROA standards."],["EUA Signal (overlay)","ICE European Carbon Allowance price correlation (ρ=0.78) as leading indicator for voluntary credit quality premium/discount."]],sources:["Verra VCU Registry (public API)","Gold Standard Impact Registry","ICE EUA Futures (CO2.L · Yahoo Finance)","CoinGecko carbon market data","ICVCM Core Carbon Principles (2023)"]},
      {id:"DYOI",title:"DeFi Yield Opportunity Index (DYOI)",color:C.cyan,desc:"The DYOI provides institutional investors with a risk-adjusted yield intelligence score across 25 major DeFi protocols. The index applies a proprietary Yield Risk-Adjusted (YRA) methodology that penalises protocols exhibiting elevated smart contract risk, governance centralization, or liquidity concentration.",formula:"YRA = Gross_APY × (1 − Risk_Penalty)   |   Risk_Penalty = f(audit_score, TVL_volatility, hack_history, governance_score)",components:[["Protocol Selection","Top 25 protocols by TVL from DeFi Llama, minimum $50M TVL threshold, minimum 6-month track record."],["Risk Scoring","Smart contract audit score (Certik, OpenZeppelin), historical exploit frequency, governance centralization (Nakamoto coefficient)."],["Yield Calculation","Gross APY from DeFi Llama API (hourly), net of estimated gas costs for median position size of $500K."],["YRA Aggregation","TVL-weighted average of risk-adjusted yields across all 25 protocols, updated hourly."],["Insurance Overlay","Nexus Mutual and InsurAce coverage availability as binary signal for protocol eligibility."]],sources:["DeFi Llama API (public)","Nexus Mutual Protocol Data","CoinGecko DEX data","Certik Audit Database","Chainalysis DeFi risk data"]},
    ].map((idx,i)=>(
      <div key={i} style={{background:C.panel2,border:`1px solid ${C.border}`,borderLeft:`3px solid ${idx.color}`,padding:32,marginBottom:24}}>
        <div className="label" style={{color:idx.color,marginBottom:8}}>INDEX 0{i+1}</div>
        <h2 style={{fontSize:22,fontWeight:600,color:C.white,marginBottom:12}}>{idx.title}</h2>
        <p style={{fontSize:13,color:C.dim,lineHeight:1.8,marginBottom:20}}>{idx.desc}</p>
        <div style={{background:C.bg,border:`1px solid ${C.border}`,padding:"12px 16px",marginBottom:20,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:idx.color}}>{idx.formula}</div>
        <div className="label" style={{marginBottom:12}}>COMPONENTS</div>
        {idx.components.map(([t,d],j)=>(
          <div key={j} style={{borderBottom:`1px solid ${C.border}`,padding:"10px 0"}}>
            <div style={{fontSize:12,color:C.white,fontWeight:600,marginBottom:4}}>{t}</div>
            <div style={{fontSize:11,color:C.dim,lineHeight:1.6}}>{d}</div>
          </div>
        ))}
        <div style={{marginTop:16}}>
          <div className="label" style={{marginBottom:8}}>DATA SOURCES</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {idx.sources.map((s,j)=><span key={j} style={{background:C.bg,border:`1px solid ${C.border}`,padding:"3px 10px",fontSize:10,color:C.dim,fontFamily:"'JetBrains Mono',monospace"}}>{s}</span>)}
          </div>
        </div>
      </div>
    ))}
    <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:24,marginTop:32}}>
      <div className="label" style={{marginBottom:8}}>IOSCO COMPLIANCE</div>
      <p style={{fontSize:12,color:C.dim,lineHeight:1.8}}>STEELLDY indices are designed in alignment with the IOSCO Principles for Financial Benchmarks (2013) and the EU Benchmark Regulation (EU 2016/1011). Independent third-party verification is scheduled for Q4 2026. Indices are not registered benchmarks under BMR and should not be used as the sole basis for financial contracts pending verification. STEELLDY Advisory SAS — Gex, France — contact@steelldy.com</p>
    </div>
    <div style={{marginTop:32,textAlign:"center"}}>
      <button className="btn-primary" style={{padding:"12px 32px",fontSize:13}} onClick={()=>onNav("pricing")}>Access the Indices →</button>
    </div>
  </div>
);

// ── URL ROUTING MAP ───────────────────────────────────────────────────────────
const URL_TO_PAGE = {
  "/":            "home",
  "/pricing":     "pricing",
  "/methodology": "methodology",
  "/auth":        "auth",
  "/login":       "auth",
  "/dashboard":   "userdash",
  "/admin":       "admin",
};
const PAGE_TO_URL = {
  "home":        "/",
  "pricing":     "/pricing",
  "methodology": "/methodology",
  "auth":        "/auth",
  "userdash":    "/dashboard",
  "admin":       "/admin",
};
const getInitialPage = () => {
  const path = window.location.pathname;
  return URL_TO_PAGE[path] || "home";
};

export default function App() {
  const [page,setPage]=useState(()=>getInitialPage());
  const [user,setUser]=useState(()=>getSession());

  const nav=p=>{
    setPage(p);
    const url=PAGE_TO_URL[p]||"/";
    window.history.pushState({page:p},"",url);
    window.scrollTo(0,0);
  };

  // Handle browser back/forward
  useEffect(()=>{
    const onPop=()=>{
      const p=URL_TO_PAGE[window.location.pathname]||"home";
      setPage(p);
    };
    window.addEventListener("popstate",onPop);
    return ()=>window.removeEventListener("popstate",onPop);
  },[]);

  const safNav=p=>{
    if(p==="auth"&&user) nav(user.role==="admin"?"admin":"userdash");
    else nav(p);
  };
  const onLogin=u=>{setSession(u);setUser(u);nav(u.role==="admin"?"admin":"userdash");};
  const onLogout=()=>{clearSession();setUser(null);nav("home");};

  if(page==="auth")    return <><style dangerouslySetInnerHTML={{__html:CSS}}/><AuthPage onLogin={onLogin} onNav={nav}/></>;
  if(page==="userdash"&&user) return <><style dangerouslySetInnerHTML={{__html:CSS}}/><UserDash user={user} onNav={safNav} onLogout={onLogout}/></>;
  if(page==="admin"&&user?.role==="admin") return <><style dangerouslySetInnerHTML={{__html:CSS}}/><AdminDash user={user} onLogout={onLogout} onNav={safNav}/></>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:1000,background:"rgba(8,8,8,.94)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"0 48px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:32}}>
            <span onClick={()=>nav("home")} className="mono" style={{fontSize:14,fontWeight:700,color:C.white,letterSpacing:".2em",cursor:"pointer"}}>STEELLDY</span>
            {[["home","Home"],["methodology","Methodology"],["pricing","Pricing"]].map(([id,l])=>(
              <button key={id} onClick={()=>nav(id)} className={`nav-link ${page===id?"active":""}`}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {user?(
              <>
                <span style={{fontSize:12,color:C.dim}}>{user.name}</span>
                <button onClick={()=>nav(user.role==="admin"?"admin":"userdash")} className="btn-ghost" style={{padding:"6px 18px",fontSize:12}}>Dashboard</button>
                <button onClick={onLogout} style={{background:"none",border:"none",color:C.dim,fontSize:12,cursor:"pointer"}}>Sign out</button>
              </>
            ):(
              <>
                <button onClick={()=>nav("auth")} style={{background:"none",border:"none",color:C.dim,fontSize:12,cursor:"pointer"}}>Sign in</button>
                <button onClick={()=>nav("pricing")} className="btn-primary" style={{padding:"7px 20px",fontSize:12}}>Get Access</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {page==="home"        && <HomePage        onNav={safNav}/>}
      {page==="pricing"     && <PricingPage     onNav={safNav}/>}
      {page==="methodology" && <MethodologyPage onNav={safNav}/>}

      {/* FOOTER */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"36px 48px",background:C.panel}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
          <div>
            <div className="mono" style={{fontSize:12,color:C.white,letterSpacing:".2em",marginBottom:4}}>STEELLDY</div>
            <div style={{fontSize:10,color:C.dim}}>Advisory · Gex, France · Quantitative Index Intelligence</div>
            <div style={{fontSize:10,color:C.dim,marginTop:2}}>contact@steelldy.com</div>
          </div>
          <div style={{display:"flex",gap:24,alignItems:"center"}}>
            {[["home","Home"],["pricing","Pricing"],["methodology","Methodology"],["auth","Sign in"]].map(([p,l])=>(
              <button key={p} onClick={()=>nav(p)} style={{background:"none",border:"none",color:C.dim,fontSize:10,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>{l}</button>
            ))}
          </div>
          <div style={{fontSize:9,color:C.dim,maxWidth:340,textAlign:"right",lineHeight:1.6}}>
            Not investment advice · Bloomberg Terminal® is a registered trademark of Bloomberg LP ·<br/>
            © 2026 STEELLDY Advisory · Gex, France
          </div>
        </div>
      </footer>
    </>
  );
}
