"""
Screener quotidien "Pépites Momentum" — Variante B validée sur 500 actions / 5 ans
Backtest 2021-2026 : +268 % (10 000 -> 36 823 $), CAGR +29,8 %, DD max -27,4 %, Sharpe 1,06

Usage : python3 screener_pepites.py          (à lancer chaque soir après 22h30 Paris)
Dépendances : pip install yfinance pandas numpy lxml

Sortie :
  - SIGNAUX COMPLETS  -> à acheter à l'ouverture du lendemain (bracket order, stop fourni)
  - BREAKOUTS SANS VOLUME -> demi-conviction, à confirmer le lendemain
  - WATCHLIST -> à <5 % du plus haut 60 j, momentum déjà validé : les prochains départs
"""
import yfinance as yf
import pandas as pd
import numpy as np
import urllib.request
import io

# ---------- 1. Univers mécanique V2 : S&P 500 + S&P 400 MidCap ----------
# V2 validée : la stratégie EARLY passe de +162 % (S&P 500 seul) à +304 % (CAGR +32 %)
# avec les midcaps — le territoire des fusées naissantes type AppLovin à 60 $ (13 Mds$).
def _wiki_symbols(page):
    req = urllib.request.Request(f"https://en.wikipedia.org/wiki/{page}",
                                 headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req).read().decode("utf-8")
    tables = pd.read_html(io.StringIO(html))
    for t in tables:
        for col in ("Symbol", "Ticker symbol", "Ticker"):
            if col in t.columns:
                return set(t[col].astype(str).str.replace(".", "-", regex=False))
    raise ValueError(f"No symbol column found in {page}")

def get_universe():
    return sorted(_wiki_symbols("List_of_S%26P_500_companies")
                  | _wiki_symbols("List_of_S%26P_400_companies"))

# ---------- 2. Critères de l'empreinte "pépite" ----------
MOM63_MIN   = 0.20    # +20 % sur 3 mois
MOM126_MIN  = 0.30    # +30 % sur 6 mois (la fusée accélère, elle ne démarre pas)
DVOL_MIN    = 50e6    # 50 M$ échangés/jour en moyenne (liquidité)
VOL_CONF    = 1.5     # volume du jour > 1,5x moyenne 20 j (l'argent institutionnel entre)
PRICE_MIN   = 10.0
ATR_STOP    = 3.0     # stop initial et suiveur à 3xATR(14)
MAX_STOP_PCT = 0.25   # on refuse un stop à plus de 25 % (trop volatil pour la taille)

def macro_feu_vert():
    """Filtre macro validé sur 5 ans : crédit risk-on (HYG > SMA100).
    Backtest B seul : +268 %, DD -27,4 %, Sharpe 1,06
    Backtest B + ce filtre : +290 %, DD -26,2 %, Sharpe 1,17 (130 trades au lieu de 154)
    Rouge = pas de NOUVELLE entrée (les positions ouvertes gardent leurs stops)."""
    hyg = yf.download("HYG", period="1y", auto_adjust=True, progress=False)["Close"].squeeze()
    ok = hyg.iloc[-1] > hyg.rolling(100).mean().iloc[-1]
    print(f"\nFEU MACRO (crédit HYG vs SMA100) : {'VERT — entrées autorisées' if ok else 'ROUGE — aucune nouvelle entrée'}")
    return bool(ok)

def screen():
    macro_feu_vert()
    uni = get_universe()
    data = yf.download(uni, period="2y", auto_adjust=True,
                       group_by="ticker", progress=False, threads=True)
    full, brk_only, watch, satellite, early_sig, early_watch = [], [], [], [], [], []
    for t in uni:
        try:
            df = data[t][["Open", "High", "Low", "Close", "Volume"]].dropna()
        except KeyError:
            continue
        if len(df) < 260:
            continue
        c = df["Close"]
        sma200 = c.rolling(200).mean().iloc[-1]
        sma50  = c.rolling(50).mean().iloc[-1]
        hh60   = df["High"].rolling(60).max().shift(1).iloc[-1]
        mom63  = c.pct_change(63).iloc[-1]
        mom126 = c.pct_change(126).iloc[-1]
        tr = pd.concat([df["High"] - df["Low"],
                        (df["High"] - c.shift()).abs(),
                        (df["Low"] - c.shift()).abs()], axis=1).max(axis=1)
        atr    = tr.rolling(14).mean().iloc[-1]
        vol20  = df["Volume"].rolling(20).mean().iloc[-1]
        dvol   = (c * df["Volume"]).rolling(20).mean().iloc[-1]
        hh252  = df["High"].rolling(252).max().shift(1).iloc[-1]
        ath    = df["High"].cummax().shift(1).iloc[-1]
        sma200_m1 = c.rolling(200).mean().shift(21).iloc[-1]
        last, lastvol = c.iloc[-1], df["Volume"].iloc[-1]
        if any(np.isnan(x) for x in (sma200, sma50, hh60, mom63, mom126, atr)):
            continue
        # ---- EARLY ROCKETS V2 (profil APP fév. 2024 à 58 $) ----
        if (not np.isnan(hh252) and not np.isnan(sma200_m1) and not np.isnan(mom63)
                and last > 10 and dvol > 20e6 and last/sma200 - 1 < 0.70
                and sma200 > sma200_m1 and 0.15 < mom63 < 0.80):
            e = dict(ticker=t, prix=round(last, 2), mom_3m=f"{mom63:+.0%}",
                     vs_ath=f"{last/ath-1:+.0%}", stop=round(last - ATR_STOP*atr, 2))
            if last > hh252 and lastvol > 2*vol20:
                early_sig.append(e)
            elif last/hh252 - 1 > -0.05:
                e["dist_52s"] = f"{last/hh252-1:+.1%}"
                early_watch.append(e)

        # Empreinte de fond : tendance alignée + momentum + liquidité
        if not (last > sma200 and sma50 > sma200 and last > PRICE_MIN
                and dvol > DVOL_MIN and mom63 > MOM63_MIN and mom126 > MOM126_MIN):
            continue
        stop = last - ATR_STOP * atr
        if ATR_STOP * atr / last > MAX_STOP_PCT:
            continue
        row = dict(ticker=t, prix=round(last, 2), mom_3m=f"{mom63:+.0%}",
                   mom_6m=f"{mom126:+.0%}", stop=round(stop, 2),
                   risque_pct=f"{ATR_STOP*atr/last:.0%}",
                   dist_hh60=f"{last/hh60-1:+.1%}")
        if last > hh60 and lastvol > VOL_CONF * vol20:
            full.append(row)                      # SIGNAL COMPLET
        elif last > hh60:
            brk_only.append(row)                  # breakout sans volume
        elif last / hh60 - 1 > -0.05:
            watch.append(row)                     # watchlist
        # --- MÉTHODE SATELLITE ---
        gap = c.pct_change().iloc[-1]
        if gap > 0.08 and lastvol > 3 * vol20 and last > sma200 and dvol > DVOL_MIN:
            sat = dict(row); sat["gap_jour"] = f"{gap:+.0%}"
            satellite.append(sat)
    key = lambda r: -float(r["mom_3m"].rstrip("%"))
    for name, rows in [("SIGNAUX COMPLETS — acheter à l'ouverture (bracket + stop)", full),
                       ("BREAKOUTS sans confirmation volume", sorted(brk_only, key=key)[:10]),
                       ("WATCHLIST — à surveiller (<5 % du déclenchement)", sorted(watch, key=key)[:15])]:
        print(f"\n=== {name} ===")
        print(pd.DataFrame(rows).to_string(index=False) if rows else "(aucun)")

if __name__ == "__main__":
    screen()

# ---------- Règles de trading associées (rappel) ----------
# ENTRÉE  : uniquement les SIGNAUX COMPLETS, à l'ouverture du lendemain, ordre bracket
# TAILLE  : 25 % du capital par position, MAX 4 positions, jamais de levier
# STOP    : 3xATR(14) sous l'entrée, remonté chaque soir (jamais baissé)
# LAISSER COURIR (règle P4, validée) : dès que le gain atteint 2x le risque initial
#           (prix >= entrée + 2 x 3xATR d'origine), ÉLARGIR le trailing à 5xATR.
#           Ne JAMAIS vendre partiellement : backtest 5 ans / 500 actions ->
#           trail élargi +363 % vs +290 % référence vs +224 % avec prises partielles.
# SORTIE  : stop touché OU clôture < SMA50 -> vente à l'ouverture suivante
# DÉPARTAGE : si plus de signaux que de slots -> priorité au momentum 3 mois le plus fort
# INTERDIT : moyenner à la baisse, entrer à moins de 5 jours d'une publication de
#           résultats, SHORTER des actions (testé : -6 000 $ sur 39 shorts, DD -38 %)
