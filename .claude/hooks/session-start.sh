#!/bin/bash
set -euo pipefail

# Only run in remote (web) environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cat << 'EOF'
SESSION START — Systeme Momentum IBKR

Lis le fichier CLAUDE.md a la racine du repo et execute les instructions de la section "AUTOMATISATION MOMENTUM — SETUP OBLIGATOIRE A CHAQUE SESSION" :

1. Cree le cron rapport du soir (CronCreate, cron "12 22 * * 1-5", recurring true) avec le prompt complet decrit dans CLAUDE.md
2. Cree le cron verification ouverture (CronCreate, cron "37 15 * * 1-5", recurring true) avec le prompt complet decrit dans CLAUDE.md
3. Verifie la connexion IBKR via get_account_summary (utilise ToolSearch pour charger le schema). Si connecte, confirme silencieusement. Si deconnecte, envoie PushNotification "IBKR deconnecte — ouvre claude.ai pour reactiver"
4. Confirme que le systeme est operationnel

Ne pose aucune question, execute directement. Lis CLAUDE.md pour les prompts detailles des crons.
EOF
