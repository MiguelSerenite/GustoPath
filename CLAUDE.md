# GustoPath + Systeme Momentum IBKR

## Instructions permanentes pour Claude Code

Ce depot contient deux projets :
1. **GustoPath** : app web de recherche de restaurants (index.html, admin.html)
2. **Systeme Momentum IBKR** : automatisation du swing trading pour le compte U13158047

## AUTOMATISATION MOMENTUM — SETUP OBLIGATOIRE A CHAQUE SESSION

Au demarrage de chaque session Claude Code sur ce repo, tu DOIS :

### 1. Creer les 2 crons de trading (CronCreate)

**Cron rapport du soir** (lun-ven 22h12 heure locale) :
- Cron: `12 22 * * 1-5`
- Pull `data/latest_screening.json` (git pull)
- Lire le compte IBKR via MCP : get_account_summary, get_account_positions, get_account_orders
- Calculer trailing stops (3xATR normal, 5xATR si gain >= 2R)
- Verifier cloture vs SMA50 pour chaque position
- Produire le rapport au format §7 de SYSTEME_MOMENTUM_IBKR.md
- Envoyer PushNotification avec resume
- ATTENDRE l'aval de Miguel avant toute instruction d'ordre
- REGLE ABSOLUE : AUCUN ORDRE SANS AVAL EXPLICITE

**Cron verification ouverture** (lun-ven 15h37 heure locale) :
- Cron: `37 15 * * 1-5`
- Verifier les executions OPG via IBKR MCP (get_account_trades)
- Calculer les stops initiaux pour les nouveaux achats (prix_execution - 3*ATR14)
- Verifier que chaque position a un stop actif
- Envoyer PushNotification avec les stops a poser
- Ne creer aucune instruction, seulement observer et notifier

### 2. Verifier la connexion IBKR
- Tenter un appel get_account_summary
- Si deconnecte : PushNotification "IBKR deconnecte — ouvre claude.ai pour reactiver"
- Si connecte : confirmer silencieusement

### 3. References
- Document de passation complet : `SYSTEME_MOMENTUM_IBKR.md`
- Screener : `scripts/screener_json.py` (tourne via GitHub Actions, pas en local)
- Resultats : `data/latest_screening.json`
- Contract IDs IBKR : AMD=4391, AAPL=265598, NVDA=4815747, PLTR=444857009, APP=481863646, TRV=43150617, HYG=43652089

### 4. Regles de trading (resume — voir SYSTEME_MOMENTUM_IBKR.md pour le detail)
- Max 4 positions, 25% NLV chacune, jamais de levier
- Stop initial : 3xATR14 sous le prix d'entree
- Trailing stop : remonte chaque soir, jamais baisse
- Regime elargi (5xATR) des que gain >= 2R
- Sortie : stop touche OU cloture < SMA50
- Jamais de prise de profit partielle
- Jamais de short, jamais de moyenne a la baisse
- Jamais d'entree a moins de 5 jours des earnings
- Feu macro (HYG > SMA100) requis pour nouvelles entrees
