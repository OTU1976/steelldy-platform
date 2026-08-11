#!/usr/bin/env python3
"""
STEELLDY — Macro Feed Refresher
DXY (US Dollar Index) · VIX (CBOE Volatility Index) · EUA (EU carbon allowances) · BTC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Why this script exists (2026-08-06):
  The dashboard's macro ticker (DXY/VIX/EUA/BTC) was reading from the
  `macro_feed_live` Supabase table, which had exactly one row, written once
  around 2026-04-03 and never updated again. The frontend still labeled it
  "LIVE". Helen caught this via a live screenshot showing a BTC price four
  months stale. This script is the actual fix: it writes a fresh row to
  `macro_feed_live` on every GitHub Actions run (:00 and :30, i.e. every
  30 minutes, same cadence as the other 9 indices).

Data sources (all free, no API key):
  DXY  : Yahoo Finance chart API, ticker DX-Y.NYB (ICE US Dollar Index)
  VIX  : Yahoo Finance chart API, ticker ^VIX (CBOE Volatility Index)
  EUA  : Yahoo Finance chart API — same ticker fallback chain already used
         and deployed in steelldy_ccqi.py (EMWCO.L / C02.DE / CO2.L), reused
         verbatim here rather than re-implemented, to avoid a second,
         possibly-diverging method for the same number.
  BTC  : CoinGecko /simple/price — same source already used by
         steelldy_free_indices.py and by the dashboard's client-side fetch.

Honesty rule: if a source fails, the corresponding column is written as
NULL, not a hardcoded placeholder. A NULL renders as "--" on the frontend.
We do not disguise a failed fetch as a real number. The row's `timestamp`
still advances on every run (even partial), which is what the dashboard
uses to decide LIVE vs STALE.

Supabase table : macro_feed_live (id, timestamp, dxy_value, vix_value,
                                   carbon_eu_price, btc_price)
Author  : STEELLDY Advisory · Gex, France
Version : 1.0 · August 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import logging
import requests
from datetime import datetime, timezone
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [MACRO] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("MACRO")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
sb = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

TIMEOUT = 15
HEADERS = {"User-Agent": "Mozilla/5.0"}


# ─── YAHOO FINANCE CHART FETCHER ───────────────────────────────────────────────
def fetch_yahoo_last_close(ticker: str) -> float | None:
    """Single-ticker Yahoo Finance chart API fetch. Returns None on failure."""
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        r = requests.get(url, params={"interval": "1d", "range": "5d"}, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        closes = result[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
        closes = [c for c in closes if c is not None]
        return float(closes[-1]) if closes else None
    except Exception as e:
        log.warning(f"Yahoo {ticker} failed: {e}")
        return None


def fetch_dxy() -> float | None:
    """US Dollar Index. Ticker: DX-Y.NYB (ICE US Dollar Index, Yahoo Finance)."""
    v = fetch_yahoo_last_close("DX-Y.NYB")
    if v is None:
        v = fetch_yahoo_last_close("DX=F")  # fallback: ICE Dollar Index futures
    if v is not None:
        log.info(f"DXY = {v:.2f}")
    else:
        log.warning("DXY fetch failed on all tickers — writing NULL")
    return v


def fetch_vix() -> float | None:
    """CBOE Volatility Index. Ticker: ^VIX."""
    v = fetch_yahoo_last_close("^VIX")
    if v is not None:
        log.info(f"VIX = {v:.2f}")
    else:
        log.warning("VIX fetch failed — writing NULL")
    return v


def fetch_eua() -> float | None:
    """
    EU carbon allowance price (EUA). Same ticker chain already deployed in
    steelldy_ccqi.py — reused verbatim, not re-derived, so CCQI and the macro
    ticker never silently disagree on the EUA price.
    """
    for ticker in ["EMWCO.L", "C02.DE", "CO2.L"]:
        v = fetch_yahoo_last_close(ticker)
        if v is not None:
            log.info(f"EUA ({ticker}) = €{v:.2f}")
            return v
    log.warning("EUA fetch failed on all tickers — writing NULL")
    return None


def fetch_btc() -> float | None:
    """BTC/USD spot price via CoinGecko (same source used elsewhere in the stack)."""
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin", "vs_currencies": "usd"},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        v = r.json().get("bitcoin", {}).get("usd")
        if v is not None:
            log.info(f"BTC = ${v:,.0f}")
            return float(v)
    except Exception as e:
        log.warning(f"CoinGecko BTC failed: {e}")
    return None


# ─── MAIN ───────────────────────────────────────────────────────────────────────
def main():
    log.info("━" * 55)
    log.info("STEELLDY Macro Feed — DXY / VIX / EUA / BTC")

    dxy = fetch_dxy()
    vix = fetch_vix()
    eua = fetch_eua()
    btc = fetch_btc()

    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dxy_value": dxy,
        "vix_value": vix,
        "carbon_eu_price": eua,
        "btc_price": btc,
    }

    fetched = sum(v is not None for v in (dxy, vix, eua, btc))
    log.info(f"{fetched}/4 sources fetched successfully")

    if not sb:
        log.warning("No SUPABASE_URL/SUPABASE_SERVICE_KEY — dry run, not writing")
        log.info(row)
        return

    try:
        sb.table("macro_feed_live").insert(row).execute()
        log.info("✅ macro_feed_live updated")
    except Exception as e:
        log.error(f"❌ Supabase write error: {e}")

    log.info("━" * 55)


if __name__ == "__main__":
    main()
