---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

Save it to `docs/handoffs/YYYY-MM-DD-<slug>.md` in this repo (create the folder lazily), then commit and push it on the current working branch. Cloud sessions are ephemeral: a handoff left in `/tmp` or the scratchpad is lost when the container is reclaimed.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs, `SYSTEME_MOMENTUM_IBKR.md`). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, account numbers, balances, positions, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
