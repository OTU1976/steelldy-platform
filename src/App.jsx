import { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SB_H   = SB_KEY ? { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } : null;

// ─── AUTH ────────────────────────────────────────────────────────────────────
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
        </div>

        {/* demo hint */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,padding:16,marginBottom:24}}>
          <div className="label" style={{color:C.dim,marginBottom:10}}>DEMO ACCOUNTS — click to fill</div>
          {[["demo@analyst.com","Analyst — €490/mo"],["demo@professional.com","Professional — €990/mo"],["demo@institution.com","Institutional — €1,490/mo"]].map(([e,l])=>(
            <div key={e} onClick={()=>{setEmail(e);setPw("demo123");setMode("login");}} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
              <span className="mono" style={{fontSize:10,color:C.text}}>{e}</span>
              <span style={{fontSize:10,color:C.dim}}>{l}</span>
            </div>
          ))}
          <div style={{fontSize:10,color:C.dim,marginTop:8}}>Password: <span className="mono" style={{color:C.white}}>demo123</span></div>
        </div>

        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderTop:`1px solid ${C.white}`,padding:28}}>
          <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:`1px solid ${C.border}`}}>
            {[["login","Sign In"],["register","Register"]].map(([m,l])=>(
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
        </div>
        <div style={{textAlign:"center",marginTop:20}}>
          <button onClick={()=>onNav("home")} style={{background:"none",border:"none",color:C.dim,fontSize:12,cursor:"pointer"}}>← Back to home</button>
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
    fetch(`${SB_URL}/rest/v1/market_data?select=*&order=timestamp.desc&limit=1`,{headers:SB_H})
      .then(r=>r.json()).then(d=>{if(d?.[0]){setEua(d[0].eua_price);setTvl(d[0].defi_tvl);}}).catch(()=>{});
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
            {["RTAI","CCQI","SSSI","CAVI","DYOI","XSQI","XCDI","ETACI","PII"].map((id,i)=>{
              const bases=[78.6,72.1,73.2,64.8,81.3,87.4,72.1,68.9,84.7];
              const v=bases[i]+(Math.random()-.5)*.5;
              const chg=(v-bases[i])/bases[i]*100;
              return (
                <div key={id} style={{background:C.panel2,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div className="mono" style={{fontSize:11,fontWeight:700,color:C.white}}>{id}</div>
                    <div style={{fontSize:9,color:C.dim,marginTop:2}}>{["RWA Tokenization","Carbon Credit","Stablecoin","CBDC Adoption","DeFi Yield","XRPL Settlement","XRPL Compute","ESG Compliance","Integrity"][i]}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="mono2" style={{fontSize:22,color:C.white}}>{bases[i].toFixed(1)}</div>
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
                <div style={{fontSize:11,color:C.dim}}>Access real-time DYOI, Polymarket oracle, VPIN alerts and API feed.</div>
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
              <div className="label" style={{marginBottom:16}}>IOSCO/BMR COMPLIANCE</div>
              {[["Governance & Accountability","Art. 5-6 BMR","✓"],["Data Sufficiency","Principle 7 IOSCO","✓"],["Methodology Transparency","Art. 13 BMR","✓"],["Conflict of Interest","Art. 4 BMR","✓"],["Third-Party Verification","Principle 12","⚠"]].map(([a,b,c])=>(
                <div key={a} style={{padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,color:C.text}}>{a}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                    <span className="mono" style={{fontSize:9,color:C.dim}}>{b}</span>
                    <span className="mono" style={{fontSize:9,color:c==="✓"?C.green:C.amber}}>{c} {c==="✓"?"Compliant":"Pending"}</span>
                  </div>
                </div>
              ))}
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
          <div style={{marginBottom:24}}>
            <div className="label" style={{marginBottom:6}}>INTELLIGENCE REPORTS</div>
            <div style={{fontSize:22,fontWeight:300,color:C.white}}>Documents & Research</div>
          </div>
          {REPORTS.map((r,i)=>{
            const ok=canDl(r.tier);
            return <div key={i} style={{background:C.panel2,border:`1px solid ${C.border}`,borderBottom:"none",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:ok?1:.5}}>
              <div>
                <div style={{fontSize:13,color:C.white,fontWeight:500}}>{r.title}</div>
                <div className="mono" style={{fontSize:9,color:C.dim,marginTop:4}}>{r.date} · {r.size} · MIN: {r.tier.toUpperCase()}</div>
              </div>
              {ok?<button className="btn-ghost" style={{padding:"6px 14px",fontSize:11}} onClick={()=>alert(`Download: ${r.title}`)}>↓</button>
                :<button className="btn-ghost" style={{padding:"6px 14px",fontSize:11,opacity:.4}} onClick={()=>onNav("pricing")}>🔒</button>}
            </div>;
          })}
          <div style={{border:`1px solid ${C.border}`,borderTop:"none",height:1}}/>
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
              {[["sitemap.xml",C.green,"✓"],["robots.txt",C.green,"✓"],["Meta OG Tags",C.green,"✓"],["JSON-LD Structured Data",C.green,"✓"],["Google Search Console",C.amber,"Pending"],["Core Web Vitals LCP",C.green,"< 2.5s"],["VITE_STRIPE_PUBLISHABLE_KEY",C.red,"⚠ Missing"]].map(([l,c,v])=>(
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
                {["Configure VITE_STRIPE_PUBLISHABLE_KEY in Vercel","Version-control JSX source in Git","Complete third-party audit for IOSCO BMR"].map((a,i)=>(
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

      {/* CCQI & DYOI SECTION */}
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
        {tier:"ANALYST",price:"€490",desc:"Essential index data for independent analysts and junior family offices.",features:["CCQI (T-1 data)","DYOI (T-1 data)","Daily intelligence report","1 user seat","Standard support"],locked:["Real-time data","API access","Reports download"],cta:"Start Free Trial",action:()=>onNav("auth")},
        {tier:"PROFESSIONAL",price:"€990",desc:"Real-time intelligence for crypto desks, hedge funds, and asset managers.",features:["Everything in Analyst","Real-time CCQI & DYOI feed","CSRD/Pillar Two alerts","Oracle Polymarket + Kalshi","VPIN & Dark Pool alerts","1 user + 1 API seat","Priority support"],locked:[],cta:"Start Free Trial",action:()=>onNav("auth"),featured:true},
        {tier:"INSTITUTIONAL",price:"€1,490",desc:"Full platform access for sovereign funds, family offices, and institutional desks.",features:["Everything in Professional","Full 9-index suite","CSRD/Pillar Two full module","Custom backtesting (CCQI 3Y)","5 users + unlimited API","Dedicated CSM + SLA 99.9%","WebSocket data feed","White-label option"],locked:[],cta:"Contact Sales",action:()=>window.location.href="mailto:contact@steelldy.com?subject=Institutional Plan"},
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
export default function App() {
  const [page,setPage]=useState("home");
  const [user,setUser]=useState(()=>getSession());

  const nav=p=>{setPage(p);window.scrollTo(0,0);};
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
            {[["home","Home"],["pricing","Pricing"]].map(([id,l])=>(
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

      {page==="home"    && <HomePage    onNav={safNav}/>}
      {page==="pricing" && <PricingPage onNav={safNav}/>}

      {/* FOOTER */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"36px 48px",background:C.panel}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
          <div>
            <div className="mono" style={{fontSize:12,color:C.white,letterSpacing:".2em",marginBottom:4}}>STEELLDY</div>
            <div style={{fontSize:10,color:C.dim}}>Advisory · Gex, France · Quantitative Index Intelligence</div>
            <div style={{fontSize:10,color:C.dim,marginTop:2}}>contact@steelldy.com</div>
          </div>
          <div style={{fontSize:9,color:C.dim,maxWidth:500,textAlign:"right",lineHeight:1.6}}>
            Not investment advice · Bloomberg Terminal® is a registered trademark of Bloomberg LP ·<br/>
            Comparison based on publicly available data as of June 2026 · © 2026 STEELLDY
          </div>
        </div>
      </footer>
    </>
  );
}
