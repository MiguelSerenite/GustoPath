#!/usr/bin/env python3
"""
GustoPath / Momentum System — Screener automatise (sortie JSON)
Identique au screener_pepites.py mais produit un fichier JSON structure
destine a etre lu par le workflow Claude Code / IBKR.

Usage : python3 scripts/screener_json.py
Sortie : data/screening_YYYY-MM-DD.json + data/latest_screening.json (symlink logique)
"""
import json
import sys
import os
import io
from datetime import datetime, timezone

import yfinance as yf
import pandas as pd
import numpy as np
import urllib.request

# ── Univers S&P 500 + S&P 400 MidCap ──
def _wiki_symbols(page):
    req = urllib.request.Request(
        f"https://en.wikipedia.org/wiki/{page}",
        headers={"User-Agent": "Mozilla/5.0"}
    )
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    tables = pd.read_html(io.StringIO(html))
    for t in tables:
        for col in ("Symbol", "Ticker symbol", "Ticker"):
            if col in t.columns:
                return set(t[col].astype(str).str.replace(".", "-", regex=False))
    raise ValueError(f"No symbol column found in {page}")

def get_universe():
    return sorted(
        _wiki_symbols("List_of_S%26P_500_companies")
        | _wiki_symbols("List_of_S%26P_400_companies")
    )

# ── Parametres (conformes au document de passation §4) ──
MOM63_MIN    = 0.20
MOM126_MIN   = 0.30
DVOL_MIN     = 50e6
VOL_CONF     = 1.5
PRICE_MIN    = 10.0
ATR_STOP     = 3.0
MAX_STOP_PCT = 0.25

def macro_check():
    hyg = yf.download("HYG", period="1y", auto_adjust=True, progress=False)["Close"].squeeze()
    if hyg.empty:
        return {"status": "UNAVAILABLE", "hyg_last": None, "hyg_sma100": None}
    last = float(hyg.iloc[-1])
    sma100 = float(hyg.rolling(100).mean().iloc[-1])
    return {
        "status": "VERT" if last > sma100 else "ROUGE",
        "hyg_last": round(last, 2),
        "hyg_sma100": round(sma100, 2)
    }

def screen():
    result = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "macro": macro_check(),
        "signals_complete": [],
        "breakouts_no_volume": [],
        "watchlist": [],
        "early_signals": [],
        "early_watchlist": [],
        "satellite": [],
        "universe_size": 0,
        "screened": 0,
        "errors": []
    }

    try:
        uni = get_universe()
    except Exception as e:
        result["errors"].append(f"Universe fetch failed: {e}")
        return result

    result["universe_size"] = len(uni)

    try:
        data = yf.download(uni, period="2y", auto_adjust=True,
                           group_by="ticker", progress=False, threads=True)
    except Exception as e:
        result["errors"].append(f"Price download failed: {e}")
        return result

    for t in uni:
        try:
            df = data[t][["Open", "High", "Low", "Close", "Volume"]].dropna()
        except (KeyError, TypeError):
            continue
        if len(df) < 260:
            continue

        result["screened"] += 1
        c = df["Close"]
        sma200 = c.rolling(200).mean().iloc[-1]
        sma50  = c.rolling(50).mean().iloc[-1]
        hh60   = df["High"].rolling(60).max().shift(1).iloc[-1]
        mom63  = c.pct_change(63).iloc[-1]
        mom126 = c.pct_change(126).iloc[-1]

        tr = pd.concat([
            df["High"] - df["Low"],
            (df["High"] - c.shift()).abs(),
            (df["Low"] - c.shift()).abs()
        ], axis=1).max(axis=1)
        atr    = tr.rolling(14).mean().iloc[-1]
        vol20  = df["Volume"].rolling(20).mean().iloc[-1]
        dvol   = (c * df["Volume"]).rolling(20).mean().iloc[-1]
        hh252  = df["High"].rolling(252).max().shift(1).iloc[-1]
        ath    = df["High"].cummax().shift(1).iloc[-1]
        sma200_m1 = c.rolling(200).mean().shift(21).iloc[-1]
        last   = float(c.iloc[-1])
        lastvol = float(df["Volume"].iloc[-1])

        if any(np.isnan(x) for x in (sma200, sma50, hh60, mom63, mom126, atr)):
            continue

        # ── EARLY ROCKETS V2 ──
        if (not np.isnan(hh252) and not np.isnan(sma200_m1) and not np.isnan(mom63)
                and last > 10 and dvol > 20e6 and last/sma200 - 1 < 0.70
                and sma200 > sma200_m1 and 0.15 < mom63 < 0.80):
            e = {
                "ticker": t,
                "price": round(last, 2),
                "mom_3m": round(mom63, 4),
                "vs_ath": round(last/ath - 1, 4),
                "stop": round(last - ATR_STOP * atr, 2),
                "atr14": round(float(atr), 2),
                "sma50": round(float(sma50), 2)
            }
            if last > hh252 and lastvol > 2 * vol20:
                result["early_signals"].append(e)
            elif last / hh252 - 1 > -0.05:
                e["dist_52w"] = round(last / hh252 - 1, 4)
                result["early_watchlist"].append(e)

        # ── Empreinte principale ──
        if not (last > sma200 and sma50 > sma200 and last > PRICE_MIN
                and dvol > DVOL_MIN and mom63 > MOM63_MIN and mom126 > MOM126_MIN):
            continue

        stop_level = last - ATR_STOP * atr
        risk_pct = ATR_STOP * atr / last
        if risk_pct > MAX_STOP_PCT:
            continue

        row = {
            "ticker": t,
            "price": round(last, 2),
            "mom_3m": round(mom63, 4),
            "mom_6m": round(mom126, 4),
            "stop": round(stop_level, 2),
            "risk_pct": round(risk_pct, 4),
            "atr14": round(float(atr), 2),
            "sma50": round(float(sma50), 2),
            "sma200": round(float(sma200), 2),
            "dist_hh60": round(last / hh60 - 1, 4),
            "dvol_m": round(dvol / 1e6, 1),
            "vol_ratio": round(lastvol / vol20, 2) if vol20 > 0 else 0
        }

        if last > hh60 and lastvol > VOL_CONF * vol20:
            result["signals_complete"].append(row)
        elif last > hh60:
            result["breakouts_no_volume"].append(row)
        elif last / hh60 - 1 > -0.05:
            result["watchlist"].append(row)

        # ── Satellite ──
        gap = float(c.pct_change().iloc[-1])
        if gap > 0.08 and lastvol > 3 * vol20 and last > sma200 and dvol > DVOL_MIN:
            sat = dict(row)
            sat["gap_day"] = round(gap, 4)
            result["satellite"].append(sat)

    # Tri par momentum 3m decroissant
    for key in ("signals_complete", "breakouts_no_volume", "watchlist",
                "early_signals", "early_watchlist", "satellite"):
        result[key].sort(key=lambda r: -r.get("mom_3m", 0))

    # Limiter watchlist/breakouts
    result["breakouts_no_volume"] = result["breakouts_no_volume"][:15]
    result["watchlist"] = result["watchlist"][:20]

    return result


if __name__ == "__main__":
    print("Screening en cours...", file=sys.stderr)
    results = screen()

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(out_dir, exist_ok=True)

    dated_path = os.path.join(out_dir, f"screening_{date_str}.json")
    latest_path = os.path.join(out_dir, "latest_screening.json")

    with open(dated_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    with open(latest_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    n_sig = len(results["signals_complete"])
    n_brk = len(results["breakouts_no_volume"])
    n_watch = len(results["watchlist"])
    n_early = len(results["early_signals"])
    macro = results["macro"]["status"]
    print(f"Feu macro: {macro} | {n_sig} signaux | {n_brk} breakouts | {n_watch} watchlist | {n_early} early", file=sys.stderr)
    print(dated_path)
