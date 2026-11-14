---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADRs and glossary) as we go.
disable-model-invocation: true
---

Run two disciplines together for the whole session:

1. **Grilling** - follow [GRILLING.md](GRILLING.md): interview the user in rounds over a design tree until the frontier is empty.
2. **Domain modeling** - follow [DOMAIN-MODELING.md](DOMAIN-MODELING.md): challenge terms against `GLOSSARY.md`, update it inline as terms are resolved, and offer ADRs (in `docs/adr/`) sparingly. Formats: [GLOSSARY-FORMAT.md](GLOSSARY-FORMAT.md), [ADR-FORMAT.md](ADR-FORMAT.md).

## In this repo

- The repo holds two contexts: **GustoPath** (restaurant search web app) and **Momentum IBKR** (swing-trading system). If a term or decision belongs to only one, use a `GLOSSARY-MAP.md` and one glossary per context rather than mixing them.
- `SYSTEME_MOMENTUM_IBKR.md` is the source of truth for the trading rules. Cross-reference it like code: if the user states a rule that contradicts it, surface the contradiction. Never edit it silently; propose the change and let the user decide.
- Grilling a trading change never authorises an order. No IBKR order instruction without Miguel's explicit go-ahead.
