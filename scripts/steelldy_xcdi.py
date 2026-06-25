"""
STEELLDY — XCDI (XRPL Compute-Dollar Index) Calculator
========================================================
Fetches REAL data from FREE public APIs:
  - CoinGecko (XRP, USDC prices — free, no API key)
  - XRPL public API (AMM pools, RLUSD/EURØP data — free, no API key)
  
Calculates XCDI and writes to Supabase.

Usage:
  pip install requests supabase python-dotenv
  python steelldy_xcdi.py              # Run once
  python steelldy_xcdi.py --loop 300   # Run every 5 minutes (for cron)

Environment variables (create a .env file):
  SUPABASE_URL=https://dcedzahmrvdxylmoesds.supabase.co
  SUPABASE_SERVICE_KEY=your_service_role_key_here  ← SECRET key, never the anon key
"""

import os
import sys
import time
import json
import logging
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("❌ Installer: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # OK si pas de .env, on utilise les variables d'environnement système

# ─── CONFIGURATION ───────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # SERVICE key, pas anon

# XRPL Public Servers (gratuit, pas de clé API)
XRPL_RPC = "https://s1.ripple.com:51234"  # Mainnet public server

# CoinGecko (gratuit, 30 appels/min sans clé)
COINGECKO_API = "https://api.coingecko.com/api/v3"

# ─── LOGGING ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [XCDI] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("XCDI")


# ═══════════════════════════════════════════════════════════════════════════════
# PARTIE 1 : COLLECTE DE DONNÉES (toutes sources gratuites)
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_coingecko_prices():
    """
    Fetch XRP et USDC prices depuis CoinGecko (gratuit, pas de clé API).
    Retourne dict { 'xrp': float, 'usdc': float }
    """
    try:
        url = f"{COINGECKO_API}/simple/price"
        params = {
            "ids": "ripple,usd-coin",
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_market_cap": "true"
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        result = {
            "xrp_price": data.get("ripple", {}).get("usd", 0),
            "xrp_change_24h": data.get("ripple", {}).get("usd_24h_change", 0),
            "xrp_mcap": data.get("ripple", {}).get("usd_market_cap", 0),
            "usdc_price": data.get("usd-coin", {}).get("usd", 1.0),
            "usdc_change_24h": data.get("usd-coin", {}).get("usd_24h_change", 0),
        }
        log.info(f"CoinGecko → XRP=${result['xrp_price']:.4f} | USDC=${result['usdc_price']:.4f}")
        return result
    except Exception as e:
        log.error(f"CoinGecko error: {e}")
        return None


def fetch_xrpl_server_info():
    """
    Fetch XRPL server info (ledger count, uptime, etc.) — gratuit.
    Mesure la santé du réseau pour le composant Infrastructure du XCDI.
    """
    try:
        payload = {"method": "server_info", "params": [{}]}
        resp = requests.post(XRPL_RPC, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        info = data.get("result", {}).get("info", {})
        result = {
            "ledger_seq": info.get("validated_ledger", {}).get("seq", 0),
            "uptime": info.get("uptime", 0),
            "load_factor": info.get("load_factor", 1),
            "peers": info.get("peers", 0),
            "server_state": info.get("server_state", "unknown"),
        }
        log.info(f"XRPL → Ledger #{result['ledger_seq']} | Peers: {result['peers']} | State: {result['server_state']}")
        return result
    except Exception as e:
        log.error(f"XRPL server_info error: {e}")
        return None


def fetch_xrpl_rlusd_info():
    """
    Fetch RLUSD (Ripple USD) token info sur XRPL.
    RLUSD est émis par Ripple (issuer: rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De).
    Retourne les obligations (amount issued) comme proxy de la circulation.
    """
    try:
        # Gateway balances pour l'émetteur RLUSD
        payload = {
            "method": "gateway_balances",
            "params": [{
                "account": "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",  # Ripple RLUSD issuer
                "strict": True,
                "ledger_index": "validated"
            }]
        }
        resp = requests.post(XRPL_RPC, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        obligations = data.get("result", {}).get("obligations", {})
        rlusd_supply = float(obligations.get("USD", 0))  # RLUSD est libellé "USD" sur XRPL
        
        log.info(f"XRPL → RLUSD supply: ${rlusd_supply:,.0f}")
        return {"rlusd_supply": rlusd_supply}
    except Exception as e:
        log.error(f"XRPL RLUSD error: {e}")
        return None


def fetch_xrpl_amm_info():
    """
    Fetch les données AMM sur XRPL pour les paires XRP/USD.
    L'AMM XRPL est natif (pas un smart contract) — données via amm_info.
    """
    try:
        # AMM pour XRP/RLUSD (si existe)
        payload = {
            "method": "amm_info",
            "params": [{
                "asset": {"currency": "XRP"},
                "asset2": {
                    "currency": "USD",
                    "issuer": "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De"
                }
            }]
        }
        resp = requests.post(XRPL_RPC, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        amm = data.get("result", {}).get("amm", {})
        if amm:
            # Extraire les réserves du pool
            amount1 = amm.get("amount", "0")
            amount2 = amm.get("amount2", {})
            
            xrp_reserve = float(amount1) / 1_000_000 if isinstance(amount1, str) else 0
            usd_reserve = float(amount2.get("value", 0)) if isinstance(amount2, dict) else 0
            
            tvl = usd_reserve * 2  # TVL approximatif = 2x une réserve
            log.info(f"XRPL AMM → XRP reserve: {xrp_reserve:,.0f} | USD reserve: ${usd_reserve:,.0f} | TVL: ${tvl:,.0f}")
            return {"amm_tvl": tvl, "amm_xrp_reserve": xrp_reserve, "amm_usd_reserve": usd_reserve}
        else:
            log.warning("AMM XRP/RLUSD pool not found — using fallback")
            return {"amm_tvl": 0, "amm_xrp_reserve": 0, "amm_usd_reserve": 0}
    except Exception as e:
        log.warning(f"XRPL AMM error (non-critique): {e}")
        return {"amm_tvl": 0, "amm_xrp_reserve": 0, "amm_usd_reserve": 0}


def fetch_xrpl_ledger_metrics():
    """
    Fetch métriques du ledger XRPL (transactions récentes, fees).
    Proxy pour l'activité du réseau.
    """
    try:
        payload = {
            "method": "ledger",
            "params": [{
                "ledger_index": "validated",
                "transactions": True,
                "expand": False
            }]
        }
        resp = requests.post(XRPL_RPC, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        ledger = data.get("result", {}).get("ledger", {})
        tx_count = len(ledger.get("transactions", []))
        close_time = ledger.get("close_time", 0)
        
        log.info(f"XRPL Ledger → {tx_count} txns in latest validated ledger")
        return {"tx_count": tx_count, "close_time": close_time}
    except Exception as e:
        log.error(f"XRPL ledger error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# PARTIE 2 : CALCUL DU XCDI (formule PhD-level de la thèse SMEA v2.0)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_xcdi(coingecko, xrpl_server, rlusd, amm, ledger):
    """
    XCDI = XRPL Compute-Dollar Index
    
    Formule (alignée avec la thèse SMEA v2.0) :
    XCDI(t) = 0.30 × XRP_Score(t) + 0.25 × RLUSD_Score(t) + 
              0.25 × INFRA_Score(t) + 0.20 × ACTIVITY_Score(t)
    
    Chaque composant est normalisé sur [0, 100].
    """
    
    scores = {}
    
    # ─── Composant 1 : XRP Settlement Utility (30%) ───
    # Basé sur le prix, la market cap, et la variation 24h
    xrp_price = coingecko.get("xrp_price", 0) if coingecko else 0
    xrp_mcap = coingecko.get("xrp_mcap", 0) if coingecko else 0
    
    # Score prix : normalisé sur [0, 100] avec bornes $0.20 (min) et $5.00 (max attendu)
    if xrp_price > 0:
        import math
        price_norm = min(100, max(0, (math.log(xrp_price) - math.log(0.20)) / (math.log(5.0) - math.log(0.20)) * 100))
    else:
        price_norm = 0
    
    # Score market cap : normalisé par rapport au top 10 crypto ($50Bn-$500Bn range)
    mcap_norm = min(100, max(0, (xrp_mcap / 1e9 - 10) / (200 - 10) * 100)) if xrp_mcap else 0
    
    scores["xrp_score"] = round(0.6 * price_norm + 0.4 * mcap_norm, 1)
    log.info(f"  XRP Score: {scores['xrp_score']}/100 (price_norm={price_norm:.1f}, mcap_norm={mcap_norm:.1f})")
    
    # ─── Composant 2 : RLUSD/EMT Ecosystem (25%) ───
    rlusd_supply = rlusd.get("rlusd_supply", 0) if rlusd else 0
    amm_tvl = amm.get("amm_tvl", 0) if amm else 0
    
    # Score supply : normalisé sur [0, 100] avec bornes $1M (min) et $500M (max attendu 2026)
    if rlusd_supply > 0:
        supply_norm = min(100, max(0, (math.log(max(rlusd_supply, 1)) - math.log(1e6)) / (math.log(5e8) - math.log(1e6)) * 100))
    else:
        supply_norm = 20  # Score plancher si données indisponibles
    
    # Score AMM TVL : normalisé sur [0, 100] avec bornes $100K (min) et $50M (max)
    if amm_tvl > 0:
        tvl_norm = min(100, max(0, (math.log(max(amm_tvl, 1)) - math.log(1e5)) / (math.log(5e7) - math.log(1e5)) * 100))
    else:
        tvl_norm = 15  # Score plancher
    
    scores["rlusd_score"] = round(0.6 * supply_norm + 0.4 * tvl_norm, 1)
    log.info(f"  RLUSD Score: {scores['rlusd_score']}/100 (supply={rlusd_supply:,.0f}, tvl={amm_tvl:,.0f})")
    
    # ─── Composant 3 : Infrastructure XRPL (25%) ───
    if xrpl_server:
        # Uptime score (en secondes, normalisé — un serveur sain a >86400s = 1 jour)
        uptime_norm = min(100, xrpl_server.get("uptime", 0) / 864000 * 100)  # /10 jours
        
        # Load factor (1.0 = normal, >2.0 = surchargé)
        load = xrpl_server.get("load_factor", 1)
        load_norm = max(0, 100 - (load - 1) * 50)  # Pénalise si load > 1
        
        # Peers (plus de peers = réseau plus sain)
        peers = xrpl_server.get("peers", 0)
        peers_norm = min(100, peers / 30 * 100)  # 30 peers = score max
        
        # Server state
        state = xrpl_server.get("server_state", "")
        state_score = 100 if state == "full" else 80 if state == "validating" else 50
        
        scores["infra_score"] = round(0.25 * uptime_norm + 0.25 * load_norm + 0.25 * peers_norm + 0.25 * state_score, 1)
    else:
        scores["infra_score"] = 50  # Fallback
    
    log.info(f"  Infra Score: {scores['infra_score']}/100")
    
    # ─── Composant 4 : Activité réseau (20%) ───
    if ledger:
        tx_count = ledger.get("tx_count", 0)
        # Normalisé : 5 txns/ledger = score 20, 50+ txns = score 100
        activity_norm = min(100, max(0, (tx_count - 5) / (50 - 5) * 100))
        scores["activity_score"] = round(activity_norm, 1)
    else:
        scores["activity_score"] = 40  # Fallback
    
    log.info(f"  Activity Score: {scores['activity_score']}/100")
    
    # ─── CALCUL FINAL XCDI ───
    xcdi = (
        0.30 * scores["xrp_score"] +
        0.25 * scores["rlusd_score"] +
        0.25 * scores["infra_score"] +
        0.20 * scores["activity_score"]
    )
    
    xcdi = round(max(0, min(100, xcdi)), 2)
    
    log.info(f"═══ XCDI = {xcdi}/100 ═══")
    
    return {
        "xcdi_value": xcdi,
        "xrp_score": scores["xrp_score"],
        "rlusd_score": scores["rlusd_score"],
        "infra_score": scores["infra_score"],
        "activity_score": scores["activity_score"],
        "xrp_price": xrp_price,
        "rlusd_supply": rlusd_supply,
        "amm_tvl": amm_tvl,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PARTIE 3 : ÉCRITURE DANS SUPABASE
# ═══════════════════════════════════════════════════════════════════════════════

def write_to_supabase(xcdi_data):
    """
    Écrit le résultat XCDI dans la table Supabase index_xcdi.
    Utilise la clé SERVICE_ROLE (jamais la clé anon côté serveur).
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.warning("⚠️  Supabase non configuré — résultat affiché en local uniquement")
        log.info(f"   XCDI = {xcdi_data['xcdi_value']} | XRP=${xcdi_data['xrp_price']:.4f}")
        return False
    
    try:
        url = f"{SUPABASE_URL}/rest/v1/index_xcdi"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "xcdi_value": xcdi_data["xcdi_value"],
            "xrp_score": xcdi_data["xrp_score"],
            "rlusd_score": xcdi_data["rlusd_score"],
            "infra_score": xcdi_data["infra_score"],
            "activity_score": xcdi_data["activity_score"],
            "xrp_price_usd": xcdi_data["xrp_price"],
            "rlusd_supply": xcdi_data["rlusd_supply"],
            "amm_tvl_usd": xcdi_data["amm_tvl"],
        }
        
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if resp.status_code in (200, 201):
            log.info(f"✅ Supabase → XCDI={xcdi_data['xcdi_value']} écrit avec succès")
            return True
        else:
            log.error(f"❌ Supabase error {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log.error(f"❌ Supabase write error: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# PARTIE 4 : TABLE SQL SUPABASE (à exécuter UNE SEULE FOIS)
# ═══════════════════════════════════════════════════════════════════════════════

SUPABASE_CREATE_TABLE_SQL = """
-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Exécuter cette commande dans Supabase > SQL Editor          ║
-- ║  UNE SEULE FOIS pour créer la table index_xcdi               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS index_xcdi (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xcdi_value      NUMERIC(6,2) NOT NULL,
    xrp_score       NUMERIC(5,1),
    rlusd_score     NUMERIC(5,1),
    infra_score     NUMERIC(5,1),
    activity_score  NUMERIC(5,1),
    xrp_price_usd   NUMERIC(12,4),
    rlusd_supply    NUMERIC(18,2),
    amm_tvl_usd     NUMERIC(18,2)
);

-- Index pour les requêtes triées par date (le frontend fait ORDER BY timestamp DESC)
CREATE INDEX IF NOT EXISTS idx_xcdi_timestamp ON index_xcdi(timestamp DESC);

-- Row Level Security : lecture publique, écriture réservée au service_role
ALTER TABLE index_xcdi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON index_xcdi
    FOR SELECT USING (true);

-- Nettoyage automatique : garder seulement les 30 derniers jours
-- (optionnel, à activer si la table grandit trop)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-xcdi', '0 3 * * *', 
--     $$DELETE FROM index_xcdi WHERE timestamp < NOW() - INTERVAL '30 days'$$);

SELECT 'Table index_xcdi créée avec succès !' AS status;
"""


# ═══════════════════════════════════════════════════════════════════════════════
# POINT D'ENTRÉE
# ═══════════════════════════════════════════════════════════════════════════════

def run_once():
    """Exécute un cycle complet : fetch → calcul → écriture."""
    log.info("─── Début du calcul XCDI ───")
    
    # 1. Collecte des données (toutes gratuites)
    coingecko = fetch_coingecko_prices()
    xrpl_server = fetch_xrpl_server_info()
    rlusd = fetch_xrpl_rlusd_info()
    amm = fetch_xrpl_amm_info()
    ledger = fetch_xrpl_ledger_metrics()
    
    # 2. Calcul XCDI
    if coingecko is None and xrpl_server is None:
        log.error("❌ Aucune donnée disponible — abandon")
        return None
    
    xcdi_data = calculate_xcdi(coingecko, xrpl_server, rlusd, amm, ledger)
    
    # 3. Écriture Supabase (ou affichage local)
    write_to_supabase(xcdi_data)
    
    log.info("─── Fin du calcul XCDI ───\n")
    return xcdi_data


def main():
    """Point d'entrée principal avec option --loop pour exécution continue."""
    
    # Afficher le SQL de création de table si demandé
    if "--sql" in sys.argv:
        print(SUPABASE_CREATE_TABLE_SQL)
        return
    
    # Mode boucle (pour cron ou service)
    loop_seconds = 0
    if "--loop" in sys.argv:
        idx = sys.argv.index("--loop")
        if idx + 1 < len(sys.argv):
            loop_seconds = int(sys.argv[idx + 1])
    
    if loop_seconds > 0:
        log.info(f"Mode boucle activé : exécution toutes les {loop_seconds} secondes")
        while True:
            try:
                run_once()
            except Exception as e:
                log.error(f"Erreur cycle: {e}")
            time.sleep(loop_seconds)
    else:
        # Exécution unique
        result = run_once()
        if result:
            print(f"\n{'='*50}")
            print(f"  XCDI = {result['xcdi_value']}/100")
            print(f"  XRP Score    = {result['xrp_score']}/100")
            print(f"  RLUSD Score  = {result['rlusd_score']}/100")
            print(f"  Infra Score  = {result['infra_score']}/100")
            print(f"  Activity     = {result['activity_score']}/100")
            print(f"  XRP Price    = ${result['xrp_price']:.4f}")
            print(f"  RLUSD Supply = ${result['rlusd_supply']:,.0f}")
            print(f"{'='*50}")


if __name__ == "__main__":
    main()
