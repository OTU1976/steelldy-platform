#!/usr/bin/env python3
"""
STEELLDY — XSQI Index Calculator
XRPL Settlement Quality Index
-----------------------------------------------------------
Data Source : XRPL Public WebSocket API (gratuit)
              xrpscan.com API (gratuit)
              XRPL.org Data API (gratuit)
Methodology : Settlement speed / finality  (25%)
              Regulatory compliance FATF/MiCA (25%)
              ODL liquidity corridors       (25%)
              ISO 20022 alignment           (25%)
Update freq : Every 15 minutes
Supabase    : Table index_xsqi
-----------------------------------------------------------
Author : STEELLDY Advisory · Gex, France
Version: 1.0 · April 2026
"""

import os
import sys
import time
import json
import logging
import requests
import websocket
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [XSQI] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("XSQI")

SUPABASE_URL     = os.getenv("SUPABASE_URL", "https://dcedzahmrvdxylmoesds.supabase.co")
SUPABASE_SVC_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
TIMEOUT          = 15

# ─── XRPL ENDPOINTS ──────────────────────────────────────────────────────────
XRPL_WS_ENDPOINTS = [
    "wss://xrplcluster.com",
    "wss://s1.ripple.com",
    "wss://s2.ripple.com",
]
XRPL_HTTP = "https://xrplcluster.com"
XRPSCAN   = "https://api.xrpscan.com/api/v1"

# ─── RLUSD ISSUER ────────────────────────────────────────────────────────────
RLUSD_ISSUER  = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De"
EURP_ISSUER   = "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"

# ─── ODL CORRIDORS (40+ corridors Ripple) ────────────────────────────────────
# compliance_score : alignement FATF Travel Rule + local regulation (0-100)
# iso20022         : support natif ISO 20022 (0-100)
ODL_CORRIDORS = [
    { "name":"USD->MXN",  "pair":"XRP/MXN",  "compliance":88, "iso20022":82, "active":True },
    { "name":"USD->PHP",  "pair":"XRP/PHP",  "compliance":85, "iso20022":78, "active":True },
    { "name":"EUR->USD",  "pair":"XRP/USD",  "compliance":92, "iso20022":90, "active":True },
    { "name":"USD->BRL",  "pair":"XRP/BRL",  "compliance":80, "iso20022":75, "active":True },
    { "name":"GBP->USD",  "pair":"XRP/USD",  "compliance":90, "iso20022":88, "active":True },
    { "name":"AUD->USD",  "pair":"XRP/USD",  "compliance":88, "iso20022":85, "active":True },
    { "name":"USD->NGN",  "pair":"XRP/NGN",  "compliance":72, "iso20022":65, "active":True },
    { "name":"USD->INR",  "pair":"XRP/INR",  "compliance":78, "iso20022":72, "active":True },
    { "name":"USD->SGD",  "pair":"XRP/SGD",  "compliance":90, "iso20022":88, "active":True },
    { "name":"JPY->USD",  "pair":"XRP/JPY",  "compliance":85, "iso20022":82, "active":True },
    { "name":"USD->ZAR",  "pair":"XRP/ZAR",  "compliance":75, "iso20022":68, "active":True },
    { "name":"USD->EUR",  "pair":"XRP/EUR",  "compliance":92, "iso20022":92, "active":True },
]


# ─── XRPL DATA FETCHERS ───────────────────────────────────────────────────────
def xrpl_request(method: str, params: dict) -> dict:
    """Appel HTTP JSON-RPC vers XRPL."""
    payload = {"method": method, "params": [params]}
    for endpoint in [XRPL_HTTP] + [e.replace("wss://", "https://") for e in XRPL_WS_ENDPOINTS[1:]]:
        try:
            r = requests.post(endpoint, json=payload, timeout=TIMEOUT)
            r.raise_for_status()
            data = r.json()
            result = data.get("result", {})
            if result.get("status") == "success" or "ledger" in result or "account_data" in result:
                return result
        except Exception as e:
            log.warning(f"XRPL endpoint {endpoint} failed: {e}")
            continue
    return {}


def fetch_ledger_stats() -> dict:
    """Récupère les stats du dernier ledger validé."""
    result = xrpl_request("ledger", {
        "ledger_index": "validated",
        "transactions": False,
        "expand":       False,
    })
    ledger = result.get("ledger", {})
    return {
        "ledger_index":    ledger.get("ledger_index", 0),
        "close_time":      ledger.get("close_time", 0),
        "total_coins":     int(ledger.get("total_coins", 0)) / 1_000_000,  # XRP
        "tx_count":        ledger.get("transaction_count", 0),
    }


def fetch_server_info() -> dict:
    """Récupère les infos du serveur XRPL (peers, état)."""
    result = xrpl_request("server_info", {})
    info   = result.get("info", {})
    return {
        "peers":          info.get("peers", 0),
        "server_state":   info.get("server_state", "unknown"),
        "ledgers_per_sec": info.get("load_factor", 1.0),
        "validated_ledgers": info.get("complete_ledgers", ""),
    }


def fetch_rlusd_supply() -> float:
    """Récupère la supply totale de RLUSD via XRPL gateway balances."""
    result = xrpl_request("gateway_balances", {
        "account":     RLUSD_ISSUER,
        "ledger_index": "validated",
    })
    obligations = result.get("obligations", {})
    rlusd_supply = 0.0
    for currency, amount in obligations.items():
        if "USD" in currency.upper() or currency == "RLUSD":
            try:
                rlusd_supply += float(amount)
            except Exception:
                pass
    log.info(f"XRPL -> RLUSD supply: ${rlusd_supply:.0f}")
    return rlusd_supply


def fetch_amm_pool_data() -> dict:
    """Récupère les données du pool AMM XRP/RLUSD."""
    result = xrpl_request("amm_info", {
        "asset":  {"currency": "XRP"},
        "asset2": {
            "currency": "USD",
            "issuer":   RLUSD_ISSUER,
        },
        "ledger_index": "validated",
    })
    amm = result.get("amm", {})
    if not amm:
        log.warning("AMM pool XRP/RLUSD not found — using fallback")
        return {"tvl_usd": 50_000_000, "trading_fee": 500}

    # Calcul TVL approximatif
    amount  = amm.get("amount", "0")
    amount2 = amm.get("amount2", {})
    xrp_amount   = float(amount) / 1_000_000 if isinstance(amount, str) else 0
    rlusd_amount = float(amount2.get("value", 0)) if isinstance(amount2, dict) else 0

    # TVL = 2 × RLUSD side (approximation parité)
    tvl_usd = rlusd_amount * 2

    return {
        "tvl_usd":     tvl_usd,
        "xrp_amount":  xrp_amount,
        "rlusd_amount": rlusd_amount,
        "trading_fee": amm.get("trading_fee", 500),
    }


def fetch_xrp_price() -> float:
    """Prix XRP via CoinGecko."""
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "ripple", "vs_currencies": "usd"},
            timeout=10
        )
        return r.json().get("ripple", {}).get("usd", 2.48)
    except Exception:
        return 2.48


# ─── XSQI CALCULATOR ─────────────────────────────────────────────────────────
def calculate_xsqi() -> dict:
    """
    XSQI = 0.25 × Speed_Score        (finality 3-5s)
         + 0.25 × Compliance_Score   (FATF/MiCA/ISO)
         + 0.25 × Liquidity_Score    (ODL corridors + AMM)
         + 0.25 × ISO20022_Score     (alignment native)
    """
    log.info("-" * 55)
    log.info("XSQI Calculation starting...")

    # 1. Ledger stats
    ledger  = fetch_ledger_stats()
    server  = fetch_server_info()
    xrp_price = fetch_xrp_price()

    log.info(f"XRPL -> Ledger #{ledger.get('ledger_index',0)} | "
             f"Peers: {server.get('peers',0)} | "
             f"State: {server.get('server_state','?')}")

    # 2. Speed Score — XRPL finalité 3-5s = benchmark 100
    # Score selon l'état du serveur
    state_scores = {
        "full":         100,
        "proposing":    95,
        "validating":   90,
        "tracking":     70,
        "syncing":      50,
        "connected":    40,
        "disconnected": 0,
    }
    server_state  = server.get("server_state", "full")
    speed_base    = state_scores.get(server_state, 80)
    peers         = server.get("peers", 20)
    # Bonus peers : plus de peers = plus robuste
    peer_bonus    = min((peers / 30) * 10, 10)
    speed_score   = min(speed_base + peer_bonus, 100)

    log.info(f"Speed Score: {speed_score:.1f} (state={server_state}, peers={peers})")

    # 3. RLUSD + AMM
    time.sleep(0.5)
    rlusd_supply = fetch_rlusd_supply()
    time.sleep(0.5)
    amm_data     = fetch_amm_pool_data()
    amm_tvl      = amm_data.get("tvl_usd", 0)

    # 4. Liquidity Score
    # Benchmark : AMM TVL $200M = score 100, $50M = score 50
    amm_score     = min((amm_tvl / 200_000_000) * 100, 100)
    # RLUSD supply : $500M = score 100
    rlusd_score   = min((rlusd_supply / 500_000_000) * 100, 100)
    # ODL corridors actifs
    active_odl    = len([c for c in ODL_CORRIDORS if c["active"]])
    odl_score     = min((active_odl / 40) * 100, 100)  # 40 corridors = 100
    liquidity_score = (amm_score * 0.40 + rlusd_score * 0.35 + odl_score * 0.25)

    log.info(f"Liquidity Score: {liquidity_score:.1f} "
             f"(AMM=${amm_tvl/1e6:.1f}M, RLUSD=${rlusd_supply/1e6:.1f}M, ODL={active_odl})")

    # 5. Compliance Score — moyenne des corridors ODL
    compliance_score = sum(c["compliance"] for c in ODL_CORRIDORS) / len(ODL_CORRIDORS)
    log.info(f"Compliance Score: {compliance_score:.1f}")

    # 6. ISO 20022 Score — moyenne des corridors
    iso_score = sum(c["iso20022"] for c in ODL_CORRIDORS) / len(ODL_CORRIDORS)
    log.info(f"ISO 20022 Score: {iso_score:.1f}")

    # 7. XSQI Final
    xsqi = (
        0.25 * speed_score       +
        0.25 * compliance_score  +
        0.25 * liquidity_score   +
        0.25 * iso_score
    )
    xsqi = round(max(0.0, min(100.0, xsqi)), 2)

    log.info("-" * 55)
    log.info(f"=== XSQI = {xsqi}/100 ===")
    log.info(f"    Speed({speed_score:.1f}) × 25% = {0.25*speed_score:.2f}")
    log.info(f"    Comply({compliance_score:.1f}) × 25% = {0.25*compliance_score:.2f}")
    log.info(f"    Liquid({liquidity_score:.1f}) × 25% = {0.25*liquidity_score:.2f}")
    log.info(f"    ISO({iso_score:.1f}) × 25% = {0.25*iso_score:.2f}")
    log.info("-" * 55)

    return {
        "xsqi_value":        xsqi,
        "speed_score":       round(speed_score, 2),
        "compliance_score":  round(compliance_score, 2),
        "liquidity_score":   round(liquidity_score, 2),
        "iso20022_score":    round(iso_score, 2),
        "ledger_index":      ledger.get("ledger_index", 0),
        "xrpl_peers":        peers,
        "server_state":      server_state,
        "rlusd_supply_usd":  round(rlusd_supply, 2),
        "amm_tvl_usd":       round(amm_tvl, 2),
        "odl_corridors":     active_odl,
        "xrp_price_usd":     xrp_price,
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
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "xsqi_value":       data["xsqi_value"],
        "speed_score":      data.get("speed_score"),
        "compliance_score": data.get("compliance_score"),
        "liquidity_score":  data.get("liquidity_score"),
        "iso20022_score":   data.get("iso20022_score"),
        "ledger_index":     data.get("ledger_index"),
        "xrpl_peers":       data.get("xrpl_peers"),
        "server_state":     data.get("server_state"),
        "rlusd_supply_usd": data.get("rlusd_supply_usd"),
        "amm_tvl_usd":      data.get("amm_tvl_usd"),
        "odl_corridors":    data.get("odl_corridors"),
        "xrp_price_usd":    data.get("xrp_price_usd"),
    }
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/index_xsqi",
            json=payload, headers=headers, timeout=10
        )
        r.raise_for_status()
        log.info(f"✅ Supabase -> XSQI={data['xsqi_value']} écrit avec succès")
        return True
    except Exception as e:
        log.error(f"❌ Supabase write error: {e}")
        return False


SUPABASE_SQL = """
CREATE TABLE IF NOT EXISTS index_xsqi (
    id                BIGSERIAL PRIMARY KEY,
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xsqi_value        NUMERIC(6,2) NOT NULL,
    speed_score       NUMERIC(5,2),
    compliance_score  NUMERIC(5,2),
    liquidity_score   NUMERIC(5,2),
    iso20022_score    NUMERIC(5,2),
    ledger_index      BIGINT,
    xrpl_peers        INTEGER,
    server_state      TEXT,
    rlusd_supply_usd  NUMERIC(20,2),
    amm_tvl_usd       NUMERIC(20,2),
    odl_corridors     INTEGER,
    xrp_price_usd     NUMERIC(10,4)
);
CREATE INDEX IF NOT EXISTS idx_xsqi_timestamp ON index_xsqi(timestamp DESC);
ALTER TABLE index_xsqi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_xsqi" ON index_xsqi FOR SELECT USING (true);
CREATE POLICY "service_write_xsqi" ON index_xsqi FOR ALL USING (auth.role() = 'service_role');
"""


def main(loop_seconds: int = 0):
    log.info("STEELLDY XSQI Calculator v1.0 — XRPL API")
    if "--sql" in sys.argv:
        print(SUPABASE_SQL)
        return
    while True:
        try:
            result = calculate_xsqi()
            write_to_supabase(result)
        except KeyboardInterrupt:
            break
        except Exception as e:
            log.error(f"Erreur: {e}")
        if loop_seconds <= 0:
            break
        log.info(f"Prochaine mise à jour dans {loop_seconds}s...")
        time.sleep(loop_seconds)


if __name__ == "__main__":
    loop = 0
    if "--loop" in sys.argv:
        idx = sys.argv.index("--loop")
        if idx + 1 < len(sys.argv):
            loop = int(sys.argv[idx + 1])
    main(loop_seconds=loop)
