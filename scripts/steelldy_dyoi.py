#!/usr/bin/env python3
"""
STEELLDY — DYOI Index Calculator v2.1
DeFi Yield Optimization Index
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHANGELOG v2.1 (June 2026):
  - Fixed 4 remaining unmatched slugs (live test on Windows PC)
  - curve-dex FRAXUSDC → symbol broadened to FRAX
  - stakewise-v3 → added swise, stakewise aliases
  - idle-finance → replaced by beefy (idle deprecated on DeFi Llama)
  - notional-v3 → replaced by fluid (notional deprecated on DeFi Llama)
  - velodrome chain: "Optimism" → "OP Mainnet"
  - 25/25 protocols matching confirmed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data Source : DeFi Llama Yields API (gratuit, aucune clé)
Methodology : YRA = Gross_APY × (1 - Risk_Penalty)
              25 protocols · beta-scoring · Nexus overlay
              Risk-adjusted yield (40%)
              Protocol beta score (25%)
              Liquidity depth (20%)
              Insurance coverage (15%)
Update freq : Every hour (DeFi Llama gratuit)
Supabase    : Table index_dyoi
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Author : STEELLDY Advisory · Gex, France
Version: 2.1 · June 2026
"""

import os
import sys
import time
import logging
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [DYOI] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("DYOI")

SUPABASE_URL     = os.getenv("SUPABASE_URL", "https://dcedzahmrvdxylmoesds.supabase.co")
SUPABASE_SVC_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
DEFILLAMA_YIELDS = "https://yields.llama.fi"
TIMEOUT          = 30

# ─── SLUG ALIASES ─────────────────────────────────────────────────────────────
# Maps our canonical name → list of DeFi Llama slugs to try (in order)
SLUG_ALIASES = {
    "aave-v3":        ["aave-v3"],
    "compound-v3":    ["compound-v3"],
    "spark":          ["sparklend", "spark", "spark-protocol"],
    "morpho-blue":    ["morpho-blue", "morpho", "morpho-aave-v3"],
    "euler-v2":       ["euler-v2", "euler"],
    "curve-dex":      ["curve-dex", "curve"],
    "uniswap-v3":     ["uniswap-v3"],
    "balancer-v2":    ["balancer", "balancer-v2"],
    "velodrome-v2":   ["velodrome", "velodrome-v2"],
    "lido":           ["lido"],
    "rocket-pool":    ["rocket-pool"],
    "frax-ether":     ["frax-ether", "fraxether"],
    "stakewise-v3":   ["stakewise-v2", "stakewise-v3", "stakewise"],
    "yearn-finance":  ["yearn-finance", "yearn"],
    "convex-finance": ["convex-finance", "convex"],
    "pendle":         ["pendle"],
    "gearbox-v3":     ["gearbox", "gearbox-v3"],
    "beefy":          ["beefy", "beefy-finance"],       # remplace idle-finance (déprécié)
    "fluid":          ["fluid", "fluid-lending", "instadapp-fluid"],  # remplace notional-v3 (déprécié)
}

# ─── 25 PROTOCOLS ─────────────────────────────────────────────────────────────
# beta       : sensibilité au marché crypto (0=stable, 1=corrélé, 2=très risqué)
# insurance  : couverture Nexus Mutual / InsurAce (0-100)
# liquidity  : profondeur TVL estimée (0-100)
# type       : lending / dex / staking / vault
PROTOCOLS = [
    # ── LENDING (8) ──────────────────────────────────────────────────────────
    {"id": "aave-v3",      "project": "aave-v3",     "chain": "Ethereum", "symbol": "USDC",    "beta": 0.15, "insurance": 85, "liquidity": 95, "type": "lending"},
    {"id": "aave-v3",      "project": "aave-v3",     "chain": "Ethereum", "symbol": "USDT",    "beta": 0.15, "insurance": 85, "liquidity": 92, "type": "lending"},
    {"id": "aave-v3",      "project": "aave-v3",     "chain": "Polygon",  "symbol": "USDC",    "beta": 0.20, "insurance": 80, "liquidity": 82, "type": "lending"},
    {"id": "compound-v3",  "project": "compound-v3", "chain": "Ethereum", "symbol": "USDC",    "beta": 0.18, "insurance": 80, "liquidity": 88, "type": "lending"},
    {"id": "compound-v3",  "project": "compound-v3", "chain": "Ethereum", "symbol": "ETH",     "beta": 0.55, "insurance": 75, "liquidity": 85, "type": "lending"},
    {"id": "spark",        "project": "spark",       "chain": "Ethereum", "symbol": "DAI",     "beta": 0.12, "insurance": 78, "liquidity": 80, "type": "lending"},
    {"id": "morpho-blue",  "project": "morpho-blue", "chain": "Ethereum", "symbol": "USDC",    "beta": 0.20, "insurance": 72, "liquidity": 78, "type": "lending"},
    {"id": "euler-v2",     "project": "euler-v2",    "chain": "Ethereum", "symbol": "USDC",    "beta": 0.25, "insurance": 65, "liquidity": 70, "type": "lending"},
    # ── DEX / LIQUIDITY (6) ──────────────────────────────────────────────────
    {"id": "curve-dex",    "project": "curve-dex",   "chain": "Ethereum", "symbol": "3CRV",    "beta": 0.30, "insurance": 75, "liquidity": 90, "type": "dex"},
    {"id": "curve-dex",    "project": "curve-dex",   "chain": "Ethereum", "symbol": "FRAX",    "beta": 0.25, "insurance": 72, "liquidity": 82, "type": "dex"},
    {"id": "uniswap-v3",   "project": "uniswap-v3",  "chain": "Ethereum", "symbol": "USDC-ETH","beta": 0.65, "insurance": 70, "liquidity": 88, "type": "dex"},
    {"id": "uniswap-v3",   "project": "uniswap-v3",  "chain": "Arbitrum", "symbol": "USDC-ETH","beta": 0.65, "insurance": 65, "liquidity": 80, "type": "dex"},
    {"id": "balancer-v2",  "project": "balancer-v2", "chain": "Ethereum", "symbol": "BAL",     "beta": 0.80, "insurance": 65, "liquidity": 72, "type": "dex"},
    {"id": "velodrome-v2", "project": "velodrome-v2","chain": "OP Mainnet","symbol": "USDC",   "beta": 0.40, "insurance": 55, "liquidity": 68, "type": "dex"},
    # ── STAKING (4) ──────────────────────────────────────────────────────────
    {"id": "lido",         "project": "lido",        "chain": "Ethereum", "symbol": "stETH",   "beta": 0.50, "insurance": 80, "liquidity": 92, "type": "staking"},
    {"id": "rocket-pool",  "project": "rocket-pool", "chain": "Ethereum", "symbol": "rETH",    "beta": 0.52, "insurance": 78, "liquidity": 82, "type": "staking"},
    {"id": "frax-ether",   "project": "frax-ether",  "chain": "Ethereum", "symbol": "sfrxETH", "beta": 0.55, "insurance": 68, "liquidity": 75, "type": "staking"},
    {"id": "stakewise-v3", "project": "stakewise-v3","chain": "Ethereum", "symbol": "OSETH",  "beta": 0.52, "insurance": 65, "liquidity": 70, "type": "staking"},
    # ── VAULTS / STRUCTURED (7) ──────────────────────────────────────────────
    {"id": "yearn-finance", "project": "yearn-finance","chain": "Ethereum","symbol": "USDC",   "beta": 0.22, "insurance": 70, "liquidity": 75, "type": "vault"},
    {"id": "yearn-finance", "project": "yearn-finance","chain": "Ethereum","symbol": "DAI",    "beta": 0.18, "insurance": 70, "liquidity": 72, "type": "vault"},
    {"id": "convex-finance","project": "convex-finance","chain":"Ethereum","symbol": "cvxCRV", "beta": 0.75, "insurance": 62, "liquidity": 78, "type": "vault"},
    {"id": "pendle",        "project": "pendle",      "chain": "Ethereum", "symbol": "stETH",  "beta": 0.55, "insurance": 60, "liquidity": 68, "type": "vault"},
    {"id": "gearbox-v3",   "project": "gearbox-v3",  "chain": "Ethereum", "symbol": "USDC",   "beta": 0.30, "insurance": 58, "liquidity": 65, "type": "vault"},
    {"id": "beefy",        "project": "beefy",       "chain": "Ethereum", "symbol": "USDC",   "beta": 0.20, "insurance": 65, "liquidity": 70, "type": "vault"},
    {"id": "fluid",        "project": "fluid",       "chain": "Ethereum", "symbol": "USDC",   "beta": 0.22, "insurance": 62, "liquidity": 68, "type": "vault"},
]


# ─── DEFILLAMA YIELDS FETCHER ─────────────────────────────────────────────────
def fetch_all_pools() -> list:
    """Récupère tous les pools DeFi Llama Yields en un seul appel."""
    try:
        r = requests.get(f"{DEFILLAMA_YIELDS}/pools", timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        pools = data.get("data", [])
        log.info(f"DeFi Llama Yields → {len(pools)} pools disponibles")
        return pools
    except Exception as e:
        log.error(f"DeFi Llama Yields error: {e}")
        return []


def build_index(pools: list) -> dict:
    """
    Construit un index rapide : {project_slug: [pool, pool, ...]}
    et {project_slug: set(chains)}
    """
    idx = {}
    for p in pools:
        proj = p.get("project", "").lower()
        if proj not in idx:
            idx[proj] = []
        idx[proj].append(p)
    return idx


def match_protocol(pool_index: dict, target: dict) -> list:
    """
    Cherche les candidats pour un protocole cible.
    Stratégie en 3 passes :
      1. slug exact + chain exact + symbol exact
      2. slug alias + chain exact + symbol partiel
      3. slug alias + symbol partiel (toutes chaînes)
    Retourne liste triée par TVL desc.
    """
    aliases = SLUG_ALIASES.get(target["id"], [target["project"]])
    chain_target  = target["chain"].lower()
    symbol_target = target["symbol"].lower()

    # Collecte tous les pools des slugs candidats
    candidates = []
    for alias in aliases:
        candidates.extend(pool_index.get(alias, []))

    if not candidates:
        return []

    # Passe 1 : chain exacte + symbol exact
    p1 = [p for p in candidates
          if p.get("chain", "").lower() == chain_target
          and symbol_target in p.get("symbol", "").lower()]
    if p1:
        return sorted(p1, key=lambda x: x.get("tvlUsd", 0) or 0, reverse=True)

    # Passe 2 : chain exacte + symbol partiel (token principal du pair)
    base_token = symbol_target.split("-")[0]  # ex: "USDC" depuis "USDC-ETH"
    p2 = [p for p in candidates
          if p.get("chain", "").lower() == chain_target
          and base_token in p.get("symbol", "").lower()]
    if p2:
        return sorted(p2, key=lambda x: x.get("tvlUsd", 0) or 0, reverse=True)

    # Passe 3 : toutes chaînes + symbol partiel (fallback cross-chain)
    p3 = [p for p in candidates
          if base_token in p.get("symbol", "").lower()]
    if p3:
        log.warning(f"  ⚠ {target['id']} {target['symbol']}: chain fallback "
                    f"(wanted {target['chain']}, found {p3[0].get('chain')})")
        return sorted(p3, key=lambda x: x.get("tvlUsd", 0) or 0, reverse=True)

    return []


# ─── DISCOVERY MODE ──────────────────────────────────────────────────────────
def discover_slugs(pools: list):
    """
    Mode --discover : imprime les slugs exacts disponibles pour
    les projets qu'on cherche.
    """
    all_slugs = set(p.get("project", "") for p in pools)
    keywords = {
        "aave", "compound", "spark", "morpho", "euler",
        "curve", "uniswap", "balancer", "velodrome",
        "lido", "rocket", "frax", "stakewise",
        "yearn", "convex", "pendle", "gearbox", "idle", "notional"
    }
    print("\n=== SLUG DISCOVERY ===")
    for kw in sorted(keywords):
        matches = sorted([s for s in all_slugs if kw in s.lower()])
        if matches:
            print(f"  {kw:15s} → {matches}")
    print("======================\n")


# ─── DYOI CALCULATOR ─────────────────────────────────────────────────────────
def calculate_risk_penalty(beta: float, apy: float) -> float:
    beta_penalty = min(beta * 0.4, 0.60)
    if apy > 50:
        apy_penalty = 0.40
    elif apy > 20:
        apy_penalty = 0.20
    elif apy > 10:
        apy_penalty = 0.05
    else:
        apy_penalty = 0.0
    return min(beta_penalty + apy_penalty, 0.85)


def calculate_dyoi(pools: list) -> dict:
    """
    DYOI = 0.40 × YRA_Score      (Yield Risk-Adjusted)
         + 0.25 × Beta_Score     (protocol risk)
         + 0.20 × Liquidity_Score
         + 0.15 × Insurance_Score

    YRA = Gross_APY × (1 - Risk_Penalty), normalisé sur benchmark 8% = 100
    """
    log.info("━" * 60)
    log.info("DYOI v2.0 Calculation starting...")

    pool_index = build_index(pools)
    results    = []
    matched    = 0
    unmatched  = []

    for target in PROTOCOLS:
        candidates = match_protocol(pool_index, target)

        if not candidates:
            log.warning(f"  ✗ NOT FOUND: {target['id']:20s} {target['chain']:10s} {target['symbol']}")
            unmatched.append(f"{target['id']} ({target['chain']}/{target['symbol']})")
            # Fallback APY conservateur selon type
            apy = {"lending": 4.5, "dex": 7.0, "staking": 3.8, "vault": 5.5}.get(target["type"], 5.0)
        else:
            best = candidates[0]
            apy  = best.get("apy", 0) or 0
            tvl  = best.get("tvlUsd", 0) or 0
            slug = best.get("project", "")
            matched += 1
            log.info(f"  ✓ {slug:22s} {target['symbol']:12s} "
                     f"APY={apy:.2f}% TVL=${tvl/1e6:.1f}M chain={best.get('chain')}")

        apy = min(apy, 200.0)
        risk_penalty = calculate_risk_penalty(target["beta"], apy)
        yra = apy * (1 - risk_penalty)

        results.append({**target, "gross_apy": round(apy, 4),
                        "risk_penalty": round(risk_penalty, 4),
                        "yra": round(yra, 4)})

    log.info(f"\n  Matched {matched}/{len(PROTOCOLS)} protocols ✅")
    if unmatched:
        log.warning(f"  Unmatched: {unmatched}")

    if not results:
        return {"dyoi_value": 63.9, "error": "no_data"}

    avg_yra   = sum(r["yra"]       for r in results) / len(results)
    avg_beta  = sum(r["beta"]      for r in results) / len(results)
    liq_score = sum(r["liquidity"] for r in results) / len(results)
    ins_score = sum(r["insurance"] for r in results) / len(results)

    yra_score  = min((avg_yra / 8.0) * 80, 100)
    beta_score = max(0, 100 - (avg_beta * 80))

    dyoi = round(max(0.0, min(100.0,
        0.40 * yra_score  +
        0.25 * beta_score +
        0.20 * liq_score  +
        0.15 * ins_score
    )), 2)

    best_yra  = max(results, key=lambda r: r["yra"])
    top_apy   = max(results, key=lambda r: r["gross_apy"])

    log.info("━" * 60)
    log.info(f"═══ DYOI = {dyoi}/100 ═══")
    log.info(f"    YRA_score={yra_score:.1f} (avg YRA={avg_yra:.2f}%) × 40% = {0.40*yra_score:.2f}")
    log.info(f"    Beta_score={beta_score:.1f} (avg β={avg_beta:.3f}) × 25% = {0.25*beta_score:.2f}")
    log.info(f"    Liquidity={liq_score:.1f} × 20% = {0.20*liq_score:.2f}")
    log.info(f"    Insurance={ins_score:.1f} × 15% = {0.15*ins_score:.2f}")
    log.info(f"    Best YRA : {best_yra['id']} {best_yra['symbol']} → {best_yra['yra']:.2f}%")
    log.info(f"    Top APY  : {top_apy['id']} {top_apy['symbol']} → {top_apy['gross_apy']:.2f}%")
    log.info("━" * 60)

    return {
        "dyoi_value":        dyoi,
        "yra_score":         round(yra_score, 2),
        "beta_score":        round(beta_score, 2),
        "liquidity_score":   round(liq_score, 2),
        "insurance_score":   round(ins_score, 2),
        "avg_yra_pct":       round(avg_yra, 4),
        "avg_beta":          round(avg_beta, 4),
        "protocols_matched": matched,
        "protocols_total":   len(PROTOCOLS),
        "best_protocol":     f"{best_yra['id']} {best_yra['symbol']}",
        "best_yra_pct":      best_yra["yra"],
        "top_apy_protocol":  f"{top_apy['id']} {top_apy['symbol']}",
        "top_gross_apy_pct": top_apy["gross_apy"],
    }


# ─── SUPABASE WRITER ─────────────────────────────────────────────────────────
def write_to_supabase(data: dict) -> bool:
    if not SUPABASE_SVC_KEY:
        log.warning("No SUPABASE_SERVICE_KEY — skipping write")
        return False

    headers = {
        "apikey":        SUPABASE_SVC_KEY,
        "Authorization": f"Bearer {SUPABASE_SVC_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    payload = {
        "timestamp":          datetime.now(timezone.utc).isoformat(),
        "dyoi_value":         data["dyoi_value"],
        "yra_score":          data.get("yra_score"),
        "beta_score":         data.get("beta_score"),
        "liquidity_score":    data.get("liquidity_score"),
        "insurance_score":    data.get("insurance_score"),
        "avg_yra_pct":        data.get("avg_yra_pct"),
        "avg_beta":           data.get("avg_beta"),
        "protocols_matched":  data.get("protocols_matched"),
        "protocols_total":    data.get("protocols_total"),
        "best_protocol":      data.get("best_protocol"),
        "best_yra_pct":       data.get("best_yra_pct"),
        "top_apy_protocol":   data.get("top_apy_protocol"),
        "top_gross_apy_pct":  data.get("top_gross_apy_pct"),
    }
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/index_dyoi",
            json=payload, headers=headers, timeout=10
        )
        r.raise_for_status()
        log.info(f"✅ Supabase → DYOI={data['dyoi_value']} écrit avec succès")
        return True
    except Exception as e:
        log.error(f"❌ Supabase write error: {e}")
        return False


# ─── SQL SUPABASE ─────────────────────────────────────────────────────────────
SUPABASE_SQL = """
CREATE TABLE IF NOT EXISTS index_dyoi (
    id                  BIGSERIAL PRIMARY KEY,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dyoi_value          NUMERIC(6,2) NOT NULL,
    yra_score           NUMERIC(5,2),
    beta_score          NUMERIC(5,2),
    liquidity_score     NUMERIC(5,2),
    insurance_score     NUMERIC(5,2),
    avg_yra_pct         NUMERIC(8,4),
    avg_beta            NUMERIC(6,4),
    protocols_matched   INTEGER,
    protocols_total     INTEGER,
    best_protocol       TEXT,
    best_yra_pct        NUMERIC(8,4),
    top_apy_protocol    TEXT,
    top_gross_apy_pct   NUMERIC(8,4)
);
CREATE INDEX IF NOT EXISTS idx_dyoi_timestamp ON index_dyoi(timestamp DESC);
ALTER TABLE index_dyoi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_dyoi"  ON index_dyoi FOR SELECT USING (true);
CREATE POLICY "service_write_dyoi" ON index_dyoi FOR ALL USING (auth.role() = 'service_role');
"""


# ─── MAIN ────────────────────────────────────────────────────────────────────
def main(loop_seconds: int = 0, test_mode: bool = False):
    log.info("STEELLDY DYOI Calculator v2.0 — DeFi Llama Yields")
    log.info(f"Tracking {len(PROTOCOLS)} protocol pools")
    if test_mode:
        log.info("⚡ TEST MODE — Supabase write disabled")

    if "--sql" in sys.argv:
        print(SUPABASE_SQL)
        return

    while True:
        try:
            pools = fetch_all_pools()

            if "--discover" in sys.argv:
                discover_slugs(pools)
                return

            result = calculate_dyoi(pools)
            log.info(f"DYOI = {result['dyoi_value']} | "
                     f"Matched {result.get('protocols_matched')}/{result.get('protocols_total')}")

            if not test_mode:
                write_to_supabase(result)
            else:
                log.info("TEST MODE: Supabase write skipped")

        except KeyboardInterrupt:
            break
        except Exception as e:
            log.error(f"Erreur: {e}")

        if loop_seconds <= 0:
            break
        log.info(f"Prochaine mise à jour dans {loop_seconds}s...")
        time.sleep(loop_seconds)


if __name__ == "__main__":
    test  = "--test" in sys.argv
    loop  = 0
    if "--loop" in sys.argv:
        idx = sys.argv.index("--loop")
        if idx + 1 < len(sys.argv):
            loop = int(sys.argv[idx + 1])
    main(loop_seconds=loop, test_mode=test)
