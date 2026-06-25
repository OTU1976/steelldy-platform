#!/usr/bin/env python3
"""
STEELLDY — RTAI Index Calculator
RWA Tokenization Activity Index
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data Source : DeFi Llama API (gratuit, aucune clé requise)
Methodology : TVL-weighted tokenization volume (30%)
              Institutional quality score (25%)
              ESMA/MiCA compliance score (25%)
              Secondary liquidity score (20%)
Update freq : Every 15 minutes via GitHub Actions ou cron
Supabase    : Table index_rtai
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Author : STEELLDY Advisory · Gex, France
Version: 1.0 · April 2026
"""

import os
import sys
import time
import logging
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ─── LOGGING ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [RTAI] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("RTAI")

# ─── CONFIG ──────────────────────────────────────────────────────────────────
SUPABASE_URL     = os.getenv("SUPABASE_URL", "https://dcedzahmrvdxylmoesds.supabase.co")
SUPABASE_SVC_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

DEFILLAMA_BASE   = "https://api.llama.fi"
TIMEOUT          = 15  # secondes

# ─── RWA PROTOCOLS — DeFi Llama slugs ────────────────────────────────────────
# Chaque protocole : (slug DeFi Llama, quality_score, compliance_score, liquidity_score)
# quality    = note institutionnelle 0-100 (BlackRock = 95, Centrifuge = 72...)
# compliance = alignement MiCA/ESMA/SEC 0-100
# liquidity  = profondeur secondaire estimée 0-100
RWA_PROTOCOLS = [
    # Tier 1 — Institutional Grade
    {
        "slug":        "blackrock-buidl",
        "name":        "BlackRock BUIDL",
        "quality":     95,
        "compliance":  92,
        "liquidity":   70,
        "weight":      1.5,   # surpondération institutionnelle
    },
    {
        "slug":        "franklin-onchain-us-government-money-fund",
        "name":        "Franklin BENJI",
        "quality":     90,
        "compliance":  90,
        "liquidity":   65,
        "weight":      1.3,
    },
    {
        "slug":        "ondo-finance",
        "name":        "Ondo OUSG/USDY",
        "quality":     82,
        "compliance":  78,
        "liquidity":   75,
        "weight":      1.2,
    },
    # Tier 2 — DeFi-native RWA
    {
        "slug":        "centrifuge",
        "name":        "Centrifuge",
        "quality":     72,
        "compliance":  68,
        "liquidity":   55,
        "weight":      1.0,
    },
    {
        "slug":        "maple",
        "name":        "Maple Finance",
        "quality":     75,
        "compliance":  65,
        "liquidity":   60,
        "weight":      1.0,
    },
    {
        "slug":        "goldfinch",
        "name":        "Goldfinch",
        "quality":     68,
        "compliance":  62,
        "liquidity":   45,
        "weight":      0.9,
    },
    {
        "slug":        "truefi",
        "name":        "TrueFi",
        "quality":     65,
        "compliance":  60,
        "liquidity":   42,
        "weight":      0.8,
    },
    {
        "slug":        "backed-finance",
        "name":        "Backed Finance",
        "quality":     78,
        "compliance":  82,   # FINMA regulated
        "liquidity":   50,
        "weight":      1.1,
    },
    {
        "slug":        "matrixdock",
        "name":        "MatrixDock",
        "quality":     70,
        "compliance":  65,
        "liquidity":   48,
        "weight":      0.9,
    },
]

# Benchmark TVL total RWA (base de référence pour normalisation)
# Source : RWA.xyz — Total RWA on-chain TVL référence
TVL_REFERENCE_USD = 10_000_000_000  # $10 Bn = RTAI baseline 100


# ─── DEFILLAMA FETCHER ───────────────────────────────────────────────────────
def fetch_protocol_tvl(slug: str) -> float:
    """Récupère le TVL actuel d'un protocole DeFi Llama."""
    url = f"{DEFILLAMA_BASE}/protocol/{slug}"
    try:
        r = requests.get(url, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        # currentChainTvls → somme de tous les chains
        chain_tvls = data.get("currentChainTvls", {})
        if chain_tvls:
            return sum(v for v in chain_tvls.values() if isinstance(v, (int, float)))
        # fallback: tvl array
        tvl_arr = data.get("tvl", [])
        if tvl_arr:
            return float(tvl_arr[-1].get("totalLiquidityUSD", 0))
        return 0.0
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            log.warning(f"Protocol not found on DeFi Llama: {slug}")
        else:
            log.warning(f"HTTP error for {slug}: {e}")
        return 0.0
    except Exception as e:
        log.warning(f"Error fetching {slug}: {e}")
        return 0.0


def fetch_total_rwa_tvl() -> float:
    """Récupère le TVL total de la catégorie RWA sur DeFi Llama."""
    url = f"{DEFILLAMA_BASE}/protocols"
    try:
        r = requests.get(url, timeout=TIMEOUT)
        r.raise_for_status()
        protocols = r.json()
        # Filtre catégories RWA
        rwa_categories = {"RWA", "RWA Lending", "Tokenized Treasury", "Real World Assets"}
        total = sum(
            p.get("tvl", 0)
            for p in protocols
            if p.get("category", "") in rwa_categories
        )
        log.info(f"DeFi Llama → Total RWA TVL: ${total/1e9:.2f}Bn")
        return total
    except Exception as e:
        log.warning(f"Error fetching total RWA TVL: {e}")
        return TVL_REFERENCE_USD  # fallback


# ─── RTAI CALCULATOR ─────────────────────────────────────────────────────────
def calculate_rtai() -> dict:
    """
    Calcule le RTAI selon la méthodologie STEELLDY :

    RTAI = 0.30 × Volume_Score
         + 0.25 × Quality_Score
         + 0.25 × Compliance_Score
         + 0.20 × Liquidity_Score

    Volume_Score = f(TVL total RWA / TVL_REFERENCE) × 100
    Quality_Score = moyenne pondérée des quality scores
    Compliance_Score = moyenne pondérée des compliance scores
    Liquidity_Score = moyenne pondérée des liquidity scores
    """
    log.info("━" * 55)
    log.info("RTAI Calculation starting...")

    # 1. Fetch TVL par protocole
    protocol_results = []
    total_weighted_tvl = 0
    total_weight = 0

    for p in RWA_PROTOCOLS:
        log.info(f"Fetching TVL: {p['name']}...")
        tvl = fetch_protocol_tvl(p["slug"])
        time.sleep(0.5)  # rate limit DeFi Llama
        protocol_results.append({**p, "tvl": tvl})
        total_weighted_tvl += tvl * p["weight"]
        total_weight += p["weight"]
        log.info(f"  {p['name']}: ${tvl/1e6:.1f}M TVL")

    # 2. TVL total RWA (catégorie entière)
    total_rwa_tvl = fetch_total_rwa_tvl()

    # 3. Volume Score — normalisé sur référence $10Bn = 100
    volume_raw = min((total_rwa_tvl / TVL_REFERENCE_USD) * 100, 100)
    # Correction : si TVL > 36Bn (record actuel), cap à 100
    volume_score = min(volume_raw * 1.1, 100)  # slight boost for growth
    log.info(f"Volume Score: {volume_score:.1f} (TVL ${total_rwa_tvl/1e9:.1f}Bn)")

    # 4. Quality Score — moyenne pondérée par TVL
    quality_num = sum(
        p["tvl"] * p["quality"] * p["weight"]
        for p in protocol_results
        if p["tvl"] > 0
    )
    quality_den = sum(
        p["tvl"] * p["weight"]
        for p in protocol_results
        if p["tvl"] > 0
    )
    quality_score = (quality_num / quality_den) if quality_den > 0 else 75.0
    log.info(f"Quality Score: {quality_score:.1f}")

    # 5. Compliance Score — même méthode
    compliance_num = sum(
        p["tvl"] * p["compliance"] * p["weight"]
        for p in protocol_results
        if p["tvl"] > 0
    )
    compliance_score = (compliance_num / quality_den) if quality_den > 0 else 68.0
    log.info(f"Compliance Score: {compliance_score:.1f}")

    # 6. Liquidity Score
    liquidity_num = sum(
        p["tvl"] * p["liquidity"] * p["weight"]
        for p in protocol_results
        if p["tvl"] > 0
    )
    liquidity_score = (liquidity_num / quality_den) if quality_den > 0 else 65.0
    log.info(f"Liquidity Score: {liquidity_score:.1f}")

    # 7. RTAI Final
    rtai = (
        0.30 * volume_score +
        0.25 * quality_score +
        0.25 * compliance_score +
        0.20 * liquidity_score
    )

    # Contraintes : RTAI ∈ [0, 100]
    rtai = round(max(0.0, min(100.0, rtai)), 2)

    log.info("━" * 55)
    log.info(f"═══ RTAI = {rtai}/100 ═══")
    log.info(f"    Volume({volume_score:.1f}) × 30% = {0.30 * volume_score:.2f}")
    log.info(f"    Quality({quality_score:.1f}) × 25% = {0.25 * quality_score:.2f}")
    log.info(f"    Comply({compliance_score:.1f}) × 25% = {0.25 * compliance_score:.2f}")
    log.info(f"    Liquid({liquidity_score:.1f}) × 20% = {0.20 * liquidity_score:.2f}")
    log.info("━" * 55)

    return {
        "rtai_value":       rtai,
        "volume_score":     round(volume_score, 2),
        "quality_score":    round(quality_score, 2),
        "compliance_score": round(compliance_score, 2),
        "liquidity_score":  round(liquidity_score, 2),
        "total_rwa_tvl_usd": round(total_rwa_tvl, 2),
        "protocols_count":  len([p for p in protocol_results if p["tvl"] > 0]),
        # Top 3 protocols par TVL
        "top1_name":  sorted(protocol_results, key=lambda x: x["tvl"], reverse=True)[0]["name"] if protocol_results else "",
        "top1_tvl":   sorted(protocol_results, key=lambda x: x["tvl"], reverse=True)[0]["tvl"] if protocol_results else 0,
        "top2_name":  sorted(protocol_results, key=lambda x: x["tvl"], reverse=True)[1]["name"] if len(protocol_results) > 1 else "",
        "top2_tvl":   sorted(protocol_results, key=lambda x: x["tvl"], reverse=True)[1]["tvl"] if len(protocol_results) > 1 else 0,
    }


# ─── SUPABASE WRITER ─────────────────────────────────────────────────────────
def write_to_supabase(data: dict) -> bool:
    """Écrit le résultat RTAI dans Supabase."""
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
        "timestamp":         datetime.now(timezone.utc).isoformat(),
        "rtai_value":        data["rtai_value"],
        "volume_score":      data["volume_score"],
        "quality_score":     data["quality_score"],
        "compliance_score":  data["compliance_score"],
        "liquidity_score":   data["liquidity_score"],
        "total_rwa_tvl_usd": data["total_rwa_tvl_usd"],
        "protocols_count":   data["protocols_count"],
        "top1_protocol":     data["top1_name"],
        "top1_tvl_usd":      data["top1_tvl"],
        "top2_protocol":     data["top2_name"],
        "top2_tvl_usd":      data["top2_tvl"],
    }

    try:
        url = f"{SUPABASE_URL}/rest/v1/index_rtai"
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        r.raise_for_status()
        log.info(f"✅ Supabase → RTAI={data['rtai_value']} écrit avec succès")
        return True
    except Exception as e:
        log.error(f"❌ Supabase write error: {e}")
        return False


# ─── SQL SETUP (à exécuter une fois dans Supabase SQL Editor) ────────────────
SUPABASE_SQL = """
-- ══════════════════════════════════════════════════════
-- Table RTAI — à exécuter dans Supabase SQL Editor
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS index_rtai (
    id                BIGSERIAL PRIMARY KEY,
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rtai_value        NUMERIC(6,2) NOT NULL,
    volume_score      NUMERIC(5,2),
    quality_score     NUMERIC(5,2),
    compliance_score  NUMERIC(5,2),
    liquidity_score   NUMERIC(5,2),
    total_rwa_tvl_usd NUMERIC(20,2),
    protocols_count   INTEGER,
    top1_protocol     TEXT,
    top1_tvl_usd      NUMERIC(20,2),
    top2_protocol     TEXT,
    top2_tvl_usd      NUMERIC(20,2)
);

CREATE INDEX IF NOT EXISTS idx_rtai_timestamp ON index_rtai(timestamp DESC);

ALTER TABLE index_rtai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_rtai" ON index_rtai
    FOR SELECT USING (true);

CREATE POLICY "service_write_rtai" ON index_rtai
    FOR ALL USING (auth.role() = 'service_role');
"""


# ─── MAIN ────────────────────────────────────────────────────────────────────
def main(loop_seconds: int = 0):
    """
    Exécution principale.
    loop_seconds=0  → une seule exécution
    loop_seconds=N  → boucle toutes les N secondes
    """
    log.info("STEELLDY RTAI Calculator v1.0 — DeFi Llama")
    log.info(f"Supabase: {SUPABASE_URL}")

    if "--sql" in sys.argv:
        print("\n" + "="*60)
        print("SQL À EXÉCUTER DANS SUPABASE SQL EDITOR:")
        print("="*60)
        print(SUPABASE_SQL)
        return

    while True:
        try:
            result = calculate_rtai()
            write_to_supabase(result)
        except KeyboardInterrupt:
            log.info("Arrêt demandé.")
            break
        except Exception as e:
            log.error(f"Erreur inattendue: {e}")

        if loop_seconds <= 0:
            break

        log.info(f"Prochaine mise à jour dans {loop_seconds}s...")
        time.sleep(loop_seconds)


if __name__ == "__main__":
    # Usage:
    #   python steelldy_rtai.py           → une exécution
    #   python steelldy_rtai.py --loop 900 → toutes les 15 min
    #   python steelldy_rtai.py --sql      → affiche le SQL Supabase

    loop = 0
    if "--loop" in sys.argv:
        idx = sys.argv.index("--loop")
        if idx + 1 < len(sys.argv):
            loop = int(sys.argv[idx + 1])

    main(loop_seconds=loop)
