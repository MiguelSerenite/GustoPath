# SYSTÈME MOMENTUM IBKR — DOCUMENT DE PASSATION
## Pour Claude Code / Claude Cowork — Automatisation complète
### Version 1.0 — 19 juillet 2026 — Propriétaire : Miguel (compte IBKR U13158047)

---

## 1. MISSION

Automatiser le système de swing trading momentum validé par backtests (5 ans, 500 actions),
en respectant UNE règle absolue et non négociable :

> **AUCUN ORDRE N'EST JAMAIS SOUMIS SANS L'AVAL EXPLICITE DE MIGUEL.**
> L'automatisation couvre : collecte de données, screening, calculs, préparation des
> instructions d'ordre, alertes, suivi. L'humain garde : la validation de chaque ordre
> (via l'onglet "AI Instructions" de l'app IBKR) et la pose/ajustement des stops.

Le connecteur MCP IBKR est déjà opérationnel et lié au compte. Il prend le relais.

---

## 2. ÉTAT DU COMPTE AU 19/07/2026 (à vérifier au démarrage)

- Valeur nette liquidative : ~27 856 $ — compte U13158047, devise de base USD
- Conversion FX effectuée le 19/07 : 14 700 EUR → 16 817,54 USD (débit USD résiduel ~-2 260 $,
  s'éteint avec les ventes du 20/07)
- **Ordres en attente (soumis, exécution à l'enchère d'ouverture du lundi 20/07, 15h30 Paris) :**
  - SELL 50 PLTR, Market, OPG
  - SELL 20 APP, Market, OPG
  - SELL 50 NVDA, Market, OPG (reste ~0,06 action fractionnée, poussière à ignorer)
- **Position conservée : 10 AMD** (prix de revient 157,12 $) protégée par un
  **stop GTC : SELL 10 AMD Stop 458,00** déjà actif dans le compte.
  AMD est en régime "trail élargi" (gain > +2R) : le stop se gère en 5×ATR (voir §5.6).
- Position poussière : 0,0409 AAPL (~14 $) — à solder à l'occasion, sans priorité.
- **Décision en attente au moment de la passation** : ticket ACHAT 18 TRV Market OPG
  proposé à Miguel, aval non encore donné. Vérifier l'état avant d'agir.

---

## 3. UNIVERS ET DONNÉES

### 3.1 Univers d'investissement (mécanique, jamais discrétionnaire) — V2
- Constituants actuels du **S&P 500 + S&P 400 MidCap** (~900 titres), rafraîchis À CHAQUE
  exécution depuis Wikipedia (List_of_S%26P_500_companies et List_of_S%26P_400_companies,
  colonne Symbol, remplacer "." par "-" pour Yahoo, ex. BRK.B → BRK-B).
- L'extension midcaps est VALIDÉE par backtest : la stratégie EARLY passe de +162 %
  (S&P 500 seul) à +304 % (CAGR +32 %) avec les midcaps — territoire des fusées
  naissantes type AppLovin début 2024 (13 Mds$ de capitalisation, 58 $).
- Ne JAMAIS ajouter ou retirer un titre manuellement. Pas de liste figée.

### 3.1bis Stratégie EARLY ROCKETS (poche complémentaire, validée)
Objectif : détecter les futures fusées au DÉPART (profil "APP février 2024 à 58 $" :
cassure de base d'un an, +66 % vs SMA200 seulement, momentum naissant +37 %, fondamentaux
en inflexion, -50 % sous l'ATH — suivi de +772 % en 12 mois), et non plus haut du mouvement
(profil "APP février 2025 à 466 $" : +163 % vs SMA200, momentum 6 m +491 % — suivi de -9 %).
- SIGNAL EARLY (technique) : clôture > plus haut 52 SEMAINES ; extension vs SMA200 < +70 % ;
  SMA200 en pente montante (vs il y a 21 séances) ; momentum 3 m entre +15 % et +80 % ;
  volume jour > 2× moyenne 20 j ; DVOL > 20 M$ ; prix > 10 $ ; feu macro VERT.
- Backtest V2 (897 titres, 2021-2026) : +304 %, CAGR +32,2 %, DD -37,3 %, Sharpe 1,04.
- CHECKLIST FONDAMENTALE OBLIGATOIRE avant tout ticket EARLY (non backtestable, à
  dérouler manuellement ou via données fondamentales) : (1) accélération SÉQUENTIELLE
  du chiffre d'affaires (T vs T-1), (2) inflexion des marges ou bénéfices, (3) catalyseur
  produit nommable et récent, (4) PER forward < croissance attendue des bénéfices.
  Si un critère manque → pas de ticket, titre en surveillance.
- Exécution : mêmes règles que le système principal (OPG, 25 % ou moins, stop 3×ATR,
  trail, P4, sortie SMA50). Le DD plus élevé (-37 %) reflète la volatilité midcaps :
  taille de position réduite acceptable (15-20 %) si Miguel le souhaite.

### 3.2 Sources de données
- **Screening quotidien** : Yahoo Finance via yfinance (period="2y", auto_adjust=True).
  Acceptable pour le screening car l'ordre final passe par validation humaine.
- **Prix d'exécution / vérifications temps réel** : API IBKR (get_price_snapshot) — source
  de vérité pour tout ce qui touche aux ordres.
- **Filtre macro** : HYG (iShares High Yield) via yfinance, period="1y".
- Si yfinance échoue (réseau, rate limit) : réessayer 3 fois espacées de 60 s, puis envoyer
  une alerte "SCREENING NON DISPONIBLE" à Miguel. Ne jamais screener sur données partielles.

### 3.3 Référentiel de correspondance IBKR
- Les instructions d'ordre IBKR utilisent des contract_id, pas des tickers.
- Résoudre chaque ticker via search_contracts (security_type STK, US) et mettre en cache
  la table ticker → contract_id. Contract_ids connus : NVDA 4815747, PLTR 444857009,
  APP 481863646, AMD 4391, AAPL 265598.

---

## 4. LE SCREENER QUOTIDIEN (variante B + feu crédit, validée)

### 4.1 Horaire — ATTENTION AUX FUSEAUX
- Déclenchement : **chaque jour de bourse US, à 16h10 heure de New York** (= 22h10 Paris
  la majeure partie de l'année, mais PAS pendant les 2-3 semaines de décalage DST de mars
  et fin octobre/début novembre).
- **Caler impérativement le cron/planificateur sur America/New_York, jamais sur Paris.**
- Jours fériés US (marché fermé) : ne rien faire. Utiliser un calendrier de bourse
  (pandas_market_calendars, calendrier NYSE) pour détecter séances et demi-séances.

### 4.2 Étape 0 — Feu macro (avant tout)
- Télécharger HYG, calculer SMA100 de la clôture.
- **FEU VERT** si dernière clôture HYG > SMA100 → nouvelles entrées autorisées.
- **FEU ROUGE** sinon → AUCUNE nouvelle entrée (les positions ouvertes gardent leurs stops
  et leurs règles de sortie ; on ne liquide pas sur feu rouge).
- Le feu s'affiche en tête de chaque rapport du soir.

### 4.3 Indicateurs par titre (sur données jusqu'à la clôture du jour)
- SMA200 et SMA50 de la clôture
- HH60 = plus haut des 60 séances PRÉCÉDENTES (rolling max High sur 60, décalé de 1 jour —
  le jour courant est exclu du plus haut de référence)
- MOM63 = variation de clôture sur 63 séances (~3 mois)
- MOM126 = variation de clôture sur 126 séances (~6 mois)
- ATR14 = moyenne mobile simple sur 14 jours du True Range
- VOL20 = volume moyen 20 séances ; DVOL = volume moyen en dollars 20 séances (close×volume)

### 4.4 SIGNAL COMPLET (tous les critères, sans exception)
1. Clôture > SMA200
2. SMA50 > SMA200 (tendance alignée)
3. Clôture > HH60 (breakout du plus haut 60 jours)
4. MOM63 > +20 %
5. MOM126 > +30 %
6. Volume du jour > 1,5 × VOL20 (confirmation institutionnelle)
7. DVOL > 50 M$ (liquidité)
8. Clôture > 10 $
9. 3×ATR14 / clôture ≤ 25 % (volatilité compatible avec le stop)
10. Feu macro VERT

### 4.5 Catégories du rapport du soir
- **SIGNAUX COMPLETS** : critères 1-10 → candidats à l'achat à l'ouverture du lendemain.
- **BREAKOUTS SANS VOLUME** : critères OK sauf le 6 → information, PAS un achat.
- **WATCHLIST** : critères de fond OK (1,2,4,5,7,8) et clôture entre -5 % et 0 % du HH60
  → les départs probables des prochains jours. Information, PAS un achat.

### 4.6 Départage
- Si plus de signaux complets que de slots libres : prioriser par **MOM63 décroissant**.

---

## 5. RÈGLES DE TRADING (exécution)

### 5.1 Entrées
- Uniquement sur SIGNAL COMPLET du screening de la veille au soir.
- Ordre : **ACHAT au marché, TIF = OPG** (exécution à l'enchère d'ouverture du lendemain).
- **Filtre earnings obligatoire** : AUCUNE entrée si le titre publie ses résultats dans les
  5 jours calendaires suivants (vérifier le calendrier earnings — yfinance get_earnings_dates
  ou calendrier IBKR). Si earnings proches → signal ignoré, le noter au rapport.

### 5.2 Taille de position
- **25 % de la valeur nette liquidative** (lue en direct via get_account_summary), arrondie
  au nombre entier d'actions inférieur.
- **Maximum 4 positions simultanées.** Jamais de 5e.
- **Jamais de levier** : le cash disponible doit couvrir l'achat. Si le cash est insuffisant
  pour 25 %, prendre ce que le cash permet ; si < 10 % du capital, ne pas entrer.
- Jamais deux positions sur le même titre.

### 5.3 Stops initiaux
- Dès l'exécution d'un achat : **stop de protection = prix d'exécution réel − 3 × ATR14**
  (ATR du jour de signal).
- L'API MCP IBKR ne crée que des instructions MARKET/LIMIT : le stop est posé par MIGUEL
  dans l'app (Vendre → type **Stop** — jamais Stop Limite — → GTC). L'automate CALCULE le
  niveau, l'envoie dans le rapport, et VÉRIFIE le lendemain via get_account_orders qu'un
  stop existe bien pour chaque position. Position sans stop détectée → ALERTE IMMÉDIATE.
- Si Claude Code implémente une exécution via l'API IBKR native (hors MCP), utiliser des
  ordres bracket (parent + stop attaché) et ce paragraphe devient automatique.

### 5.4 Trailing stop (remonté chaque soir, jamais descendu)
- Chaque soir après clôture : nouveau stop théorique = max(stop actuel, clôture − 3×ATR14).
- Publier au rapport la liste des stops à remonter (titre, ancien niveau, nouveau niveau) ;
  Miguel les ajuste dans l'app (modifier l'ordre stop GTC existant).

### 5.5 Sorties
- **Stop touché** → la vente s'exécute seule (ordre stop GTC au marché).
- **Clôture < SMA50** → instruction de VENTE au marché, TIF OPG, créée le soir même
  (avec aval), exécution à l'ouverture du lendemain.
- La première des deux conditions atteinte l'emporte. Aucune autre raison de vendre
  (pas de vente sur intuition, news, ou baisse intraday).

### 5.6 Règle "laisser courir" (P4, validée : +363 % vs +290 % en backtest)
- Dès qu'une position atteint un gain ≥ **2 × R** (R = 3×ATR14 du jour d'entrée, en $/action) :
  passer le trailing de 3×ATR à **5×ATR** pour cette position, définitivement.
- **JAMAIS de prise de profit partielle** (testé : détruit 47 à 66 points de performance).
- La sortie SMA50 (§5.5) reste active même en régime 5×ATR.
- AMD est déjà dans ce régime au moment de la passation.

### 5.7 Interdictions absolues
- Vente à découvert (testée : -6 012 $ sur 39 shorts, DD aggravé à -38 %)
- Moyenner à la baisse
- Levier / marge pour les positions
- Prises de profit partielles
- Options, futures, crypto dans ce système
- Entrée à moins de 5 jours d'une publication de résultats
- Position sans stop actif
- Toute décision discrétionnaire ("cette fois c'est différent")
- Filtres VIX ou taux d'intérêt (testés : dégradent les résultats)

### 5.8 Gestion du drawdown (kill switch progressif — PAS de liquidation brutale)
- Suivre le plus-haut historique de la valeur nette (high-water mark, persisté sur disque).
- Drawdown > 15 % : nouvelles positions réduites à 15 % du capital (au lieu de 25 %).
- Drawdown > 25 % : plus aucune nouvelle entrée ; les positions existantes suivent leurs
  stops jusqu'à extinction ; revue complète du système avec Miguel avant redémarrage.
- Ne JAMAIS liquider les positions existantes à cause du drawdown seul (l'ancien kill
  switch à liquidation aurait vendu au pire moment d'août 2024 en backtest).

---

## 6. WORKFLOW QUOTIDIEN AUTOMATISÉ

### 16h10 New York — SCREENING (cœur du système)
1. Vérifier séance de bourse (calendrier NYSE). Si fermé → stop.
2. Feu macro HYG (§4.2).
3. Télécharger l'univers S&P 500 + données 2 ans.
4. Calculer indicateurs, produire : signaux complets / breakouts sans volume / watchlist.
5. Lire le compte IBKR : positions, valeur nette, ordres actifs, stops présents.
6. Contrôles : chaque position a-t-elle son stop ? clôtures < SMA50 ? gains ≥ 2R
   (passage en 5×ATR) ? stops à remonter ?
7. Composer le **RAPPORT DU SOIR** (format §7) et l'envoyer à Miguel.
8. Pour chaque action proposée (achat, vente SMA50) : ATTENDRE L'AVAL. Sur aval reçu →
   create_order_instruction (MARKET, OPG) → Miguel soumet dans l'app IBKR (onglet
   AI Instructions ; les instructions expirent après 7 jours).

### 9h35 New York (15h35 Paris, lendemain) — VÉRIFICATION D'OUVERTURE
1. get_account_orders + get_account_trades : confirmer les exécutions OPG et leurs prix.
2. Pour chaque achat exécuté : calculer le stop initial (§5.3), l'envoyer à Miguel avec
   rappel "à poser maintenant", puis vérifier sa présence 30 minutes plus tard.
3. Signaler tout écart (ordre non exécuté, exécution partielle, prix anormal vs clôture
   de la veille > 5 % = gap, à mentionner).

### Contrôle continu (si l'infrastructure le permet, sinon aux deux rendez-vous ci-dessus)
- Détection de stop exécuté en séance → notification à Miguel (position fermée, P&L).

---

## 7. FORMAT DU RAPPORT DU SOIR (à respecter)

```
SCREENING [date] — Feu macro : VERT/ROUGE (HYG x,xx vs SMA100 x,xx)
Compte : NLV xx xxx $ | x/4 positions | cash xx xxx $ | DD depuis plus-haut : x %
Positions : [TICKER +x % | stop actuel xxx | régime 3ATR ou 5ATR | statut vs SMA50]
Stops à remonter : [TICKER : ancien → nouveau]
SIGNAUX COMPLETS : [TICKER prix | mom 3m | stop proposé | taille proposée | earnings ok?]
   → Ticket proposé : ACHAT n TICKER Market OPG (~x xxx $) — EN ATTENTE D'AVAL
Breakouts sans volume : [liste courte]
Watchlist (<5 % du déclencheur) : [liste courte]
Signaux écartés : [TICKER — raison : earnings J-x / feu rouge / slots pleins]
```

---

## 8. CAS LIMITES ET PANNES (ne rien improviser)

- **Gap d'ouverture sous un stop** : l'ordre stop GTC vend au marché à l'ouverture ; c'est
  le comportement attendu. Noter le slippage au rapport.
- **Exécution partielle d'un ordre OPG** : conserver le reliquat en DAY et le signaler.
- **Split / dividende** : yfinance auto_adjust gère l'historique ; MAIS vérifier que la
  quantité et le stop IBKR sont cohérents après tout split (alerte si position ≠ attendu).
- **Ticker retiré du S&P 500 en cours de position** : la position suit ses règles de
  sortie normales ; le titre n'est simplement plus screené pour de nouvelles entrées.
- **Halt / suspension d'un titre en position** : alerte immédiate, aucune action auto.
- **Données manquantes pour un titre** (IPO récente, historique < 260 séances) : exclu
  du screening, sans erreur.
- **Échec de create_order_instruction** : réessayer 1 fois ; sinon fournir à Miguel le
  ticket manuel complet (sens, quantité, type, TIF) pour saisie directe dans l'app.
- **Perte de connexion IBKR ("No approval received")** : demander à Miguel de réactiver
  la session ; ne JAMAIS mémoriser ni demander ses identifiants.
- **Deux aval ambigus ou contradictoires** : ne rien créer, redemander.
- **Toute situation non prévue par ce document** : ne rien faire + alerte à Miguel.
  L'inaction est toujours préférable à une improvisation.

---

## 9. JOURNALISATION (obligatoire)

Tenir un journal append-only (CSV ou SQLite) :
- Chaque screening : date, feu macro, signaux, watchlist, écartés + raison.
- Chaque instruction créée : horodatage, ticket complet, ID instruction, aval (citation).
- Chaque exécution : prix, quantité, frais, slippage vs clôture de la veille.
- Chaque position fermée : P&L, raison de sortie (STOP / SMA50), durée de détention.
- Statistiques cumulées mensuelles : équité, drawdown, win rate, gain moyen / perte moyenne
  (référence backtest : ~40-44 % gagnants, ratio gain/perte ≈ 3:1 — s'en écarter fortement
  = signal d'anomalie à investiguer).

---

## 10. RÉFÉRENCE — CE QUI A ÉTÉ VALIDÉ ET REJETÉ (backtests 2021-2026, 500 actions, 10 K$)

| Configuration | Résultat 5 ans | Verdict |
|---|---|---|
| Règles de base univers biaisé 12 titres | +600 % | Artefact de biais de survie — NE PAS répliquer |
| Règles de base univers S&P 500 | +172 %, DD -35 % | Base honnête |
| + Filtres volume/liquidité/MOM126 (variante B) | +268 %, DD -27 % | ADOPTE |
| + Feu crédit HYG>SMA100 | +290 %, DD -26 %, Sharpe 1,17 | ADOPTE |
| + Trail élargi 5xATR après +2R (P4) | +363 %, DD -25 %, Sharpe 1,22 | ADOPTE |
| Prises de profit partielles | +224 à +302 % | REJETE |
| Shorts miroir sur feu rouge | +111 %, DD -38 % | REJETE |
| Filtre VIX < 25 | +168 %, DD -42 % | REJETE |
| Filtre taux 10 ans | +111 %, DD -40 % | REJETE |

Ces chiffres sont des backtests : une seule période, biais résiduel (constituants actuels),
slippage réel non modélisé. Ils valident la HIÉRARCHIE des règles, pas une promesse de
rendement. Aucune communication ne doit présenter ces performances comme garanties.

---

## 11. CHECKLIST DE DÉMARRAGE POUR CLAUDE CODE / COWORK

1. [ ] Lire ce document en entier avant toute action.
2. [ ] Vérifier la connexion IBKR : get_account_summary doit retourner le compte U13158047.
3. [ ] Réconcilier l'état réel avec le §2 (positions, ordres, stop AMD, décision TRV).
4. [ ] Installer : python3, yfinance, pandas, numpy, pandas_market_calendars.
5. [ ] Récupérer le script de référence `screener_pepites.py` (fourni par Miguel) et
   vérifier qu'il reproduit les critères du §4 à l'identique.
6. [ ] Planifier les deux tâches (§6) en fuseau America/New_York.
7. [ ] Premier run à blanc (dry-run) : produire le rapport SANS créer d'instruction,
   le faire valider par Miguel.
8. [ ] Mettre en place le journal (§9) et le high-water mark (§9).
9. [ ] Activer le mode réel : rapports quotidiens + instructions sur aval uniquement.
10. [ ] Ne modifier AUCUN paramètre du système sans backtest comparatif préalable validé
    par Miguel (les paramètres sont le fruit de tests — pas des variables d'ajustement).

---

*Document de passation rédigé par Claude (chat) le 19/07/2026 sur la base des backtests
et décisions des conversations avec Miguel. Toute évolution des règles doit être testée
sur les 5 ans de données avant adoption, et documentée ici en nouvelle version.*
