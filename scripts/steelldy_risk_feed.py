#!/usr/bin/env python3
"""
STEELLDY — Risk Feed Refresher
Historical VaR/CVaR (BTC) · Bulk Volume Classification informed-trading proxy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Why this script exists (2026-08-06):
  The dashboard's Risk tab read from `quant_risk_jsm3`, a table with exactly
  one row written around 2026-04-11 and never updated since — labeled ACTIVE
  regardless. The same tab also displayed a market-making panel (Avellaneda-
  Stoikov quote spreads, Hawkes process intensity, Kelly criterion sizing)
  that had zero backing anywhere in this codebase: STEELLDY is a data vendor,
  it does not run a market-making desk, so there was no honest way to keep
  that panel — it was removed from the frontend. This script replaces the
  dead table with two real, computed, correctly-cited metrics instead.

Methodology (both computed from CoinGecko's free /market_chart endpoint,
100 days of BTC daily OHLC + volume, no API key required):

  1. Historical simulation VaR / CVaR (BIS/Basel-style, non-parametric):
       daily log returns r_t = ln(P_t / P_t-1)
       VaR_95  = -percentile(r, 5)         (1-day, 95% confidence)
       VaR_99  = -percentile(r, 1)         (1-day, 99% confidence)
       CVaR_95 = -mean(r[r <= -VaR_95])    (Expected Shortfall beyond VaR_95)
     This is the standard historical-simulation VaR method described in
     Basel Committee on Banking Supervision guidance (BCBS "Minimum capital
     requirements for market risk", FRTB) — not a proprietary model, a
     textbook non-parametric estimator applied to real BTC return data.

  2. VPIN proxy via Bulk Volume Classification (Easley, Lopez de Prado &
     O'Hara, "Flow Toxicity and Liquidity in a High-Frequency World", 2012):
     true tick-level VPIN needs trade-by-trade buy/sell classification,
     which isn't available from free daily OHLCV data. BVC is the published
     approximation for exactly this situation — it classifies each day's
     volume into buy/sell using the standard normal CDF of the
     volatility-standardized price change instead of actual trade signs:
       Z_t = (P_t - P_t-1) / sigma(returns)
       Buy_t  = V_t * Phi(Z_t)
       Sell_t = V_t * (1 - Phi(Z_t))
       VPIN_proxy = mean(|Buy_t - Sell_t| / V_t) over the trailing window
     This is a real, citable approximation — labeled "proxy" throughout the
     UI, never presented as tick-level VPIN.

Honesty rule: on fetch/compute failure, columns are written as NULL, not a
hardcoded placeholder.

Supabase table : quant_risk_jsm3 (id, timestamp, var_95, cvar_95, vpin_core)
                 (var_99 and columns below added via migration — see NOTE)
Author  : STEELLDY Advisory · Gex, France
Version : 1.0 · August 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import math
import logging
import statistics
import requests
from datetime import datetime, timezone
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [RISK] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("RISK")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
sb = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

TIMEOUT = 20


def norm_cdf(x: float) -> float:
    """Standard normal CDF via the error function (no scipy dependency)."""
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def fetch_btc_history(days: int = 100):
    """Returns (closes, volumes) as parallel lists, oldest → newest. None on failure."""
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart",
            params={"vs_currency": "usd", "days": days, "interval": "daily"},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        prices = [p[1] for p in data.get("prices", [])]
        volumes = [v[1] for v in data.get("total_volumes", [])]
        if len(prices) < 20:
            log.warning(f"Only {len(prices)} days returned — too few for a stable estimate")
            return None, None
        n = min(len(prices), len(volumes))
        return prices[:n], volumes[:n]
    except Exception as e:
        log.warning(f"CoinGecko market_chart failed: {e}")
        return None, None


def compute_var_cvar(closes: list):
    """Historical simulation VaR95/VaR99/CVaR95 on daily log returns."""
    returns = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes)) if closes[i - 1] > 0]
    if len(returns) < 20:
        return None, None, None
    returns_sorted = sorted(returns)
    n = len(returns_sorted)

    def percentile(p):
        idx = max(0, min(n - 1, int(round(p / 100 * (n - 1)))))
        return returns_sorted[idx]

    var_95 = -percentile(5)
    var_99 = -percentile(1)
    tail = [r for r in returns if r <= -var_95]
    cvar_95 = -statistics.mean(tail) if tail else var_95
    return round(var_95, 4), round(var_99, 4), round(cvar_95, 4)


def compute_vpin_proxy(closes: list, volumes: list, window: int = 20):
    """Bulk Volume Classification VPIN approximation (Easley/Lopez de Prado/O'Hara 2012)."""
    changes = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    if len(changes) < window + 1:
        return None
    sigma = statistics.pstdev(changes)
    if sigma == 0:
        return None

    imbalances = []
    for i in range(1, len(closes)):
        z = changes[i - 1] / sigma
        buy_frac = norm_cdf(z)
        vol = volumes[i] if i < len(volumes) else 0
        buy_vol = vol * buy_frac
        sell_vol = vol * (1 - buy_frac)
        imbalance = abs(buy_vol - sell_vol) / vol if vol > 0 else 0
        imbalances.append(imbalance)

    recent = imbalances[-window:]
    return round(statistics.mean(recent), 4) if recent else None


def main():
    log.info("━" * 55)
    log.info("STEELLDY Risk Feed — Historical VaR/CVaR + BVC VPIN proxy (BTC)")

    closes, volumes = fetch_btc_history()
    var_95 = var_99 = cvar_95 = vpin_proxy = None

    if closes:
        var_95, var_99, cvar_95 = compute_var_cvar(closes)
        vpin_proxy = compute_vpin_proxy(closes, volumes)
        if var_95 is not None:
            log.info(f"VaR95={var_95:.4f} ({var_95*100:.2f}%) | VaR99={var_99:.4f} | CVaR95={cvar_95:.4f}")
        if vpin_proxy is not None:
            log.info(f"VPIN proxy (BVC, {min(20,len(closes))}d window) = {vpin_proxy:.4f}")
    else:
        log.warning("No BTC history — writing NULL for all fields")

    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "var_95": var_95,
        "var_99": var_99,
        "cvar_95": cvar_95,
        "vpin_core": vpin_proxy,
    }

    if not sb:
        log.warning("No SUPABASE_URL/SUPABASE_SERVICE_KEY — dry run, not writing")
        log.info(row)
        return

    try:
        sb.table("quant_risk_jsm3").insert(row).execute()
        log.info("✅ quant_risk_jsm3 updated")
    except Exception as e:
        log.error(f"❌ Supabase write error: {e}")

    log.info("━" * 55)


if __name__ == "__main__":
    main()
