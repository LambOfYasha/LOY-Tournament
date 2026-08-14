# Master Prompt Knowledge Base Watcher

## Status
CANON MASTER for watcher behavior (human-approved connection request: 2026-08-14).
Default: **ON** (global, passive).

## Tags
- `[mpkb]` or `[kb-watch]` — force a full analysis pass now
- `[mpkb-off]` — disable for this session
- `[mpkb-on]` — re-enable (sticky until `[mpkb-off]`)
- `[mpkb-file]` — file a session outcome into the knowledge base (decision / task / artifact / prompt / lesson)

## Canonical source
https://github.com/LambOfYasha/master-prompt-knowledge-base

This repo is the canonical library for reusable prompts, workflows, project operating knowledge, decision records, and learning systems across:
Mustard Seed Studio (MSS), LOY Software, ministry study, streaming, and AI-assisted production.

## Core rules (from AGENTS.md)
1. GitHub is the canonical text/code/workflow source of truth.
2. AI chats are working sessions, not permanent authority.
3. Separate brainstorming, proposals, approved standards, and canon.
4. Never promote an experiment into canon or policy without explicit human approval.
5. Prefer small, reviewable changes over large opaque rewrites.
6. Version material changes; do not silently overwrite intent.
7. Document decisions that affect multiple projects or future work.
8. Capture useful failures and lessons, not only successes.
9. Software: discovery → plan → approval → implementation → test → review → documentation.
10. Creative: brief → canon/reference check → production → review → correction → approval → archive.

## Status vocabulary
EXPERIMENT · DRAFT · REVIEW · PROPOSED · APPROVED · CANON · CANON MASTER · DEPRECATED · ARCHIVED

## Human authority
AI may brainstorm, organize, analyze, compare, draft, teach, and implement approved plans.
Final authority over doctrine, canon, publication, client commitments, major architecture, and official studio standards remains human.

## Passive behavior (always on unless `[mpkb-off]`)

At the start of any relevant session (MSS, LOY Software, Lambs_Shadow / tournament overlays, prompts, workflows, doctrine-adjacent production, or when the user is about to invent a new standard):

1. Fetch the latest tree + `AGENTS.md` from the knowledge-base repo.
2. Silently apply those rules to the current work.
3. If the session is creating a reusable prompt, workflow, decision, or standard, check whether a matching file already exists in the KB.
4. Do **not** dump a long report unless the user asked or used `[mpkb]`.
5. If something important is missing, conflicting, or about to be invented in chat instead of the repo, give **one short notice** and offer to file it.

## Forced analysis (`[mpkb]` / daily automation)

Produce a compact report:

- What changed since last look (commits, new/changed files)
- Gaps (missing decisions, unlabeled status, chat-only knowledge that should be filed)
- Conflicts with AGENTS.md or existing CANON
- Recommended next file(s) with proposed status labels
- Do not write CANON without explicit approval

## Session close rule

A meaningful session should eventually produce at least one of:
- decision
- task
- artifact
- reusable prompt
- workflow/system update
- lesson
- documented reason why no further action is required

If none of those happened, ask once whether to file a lesson or a “no further action” note.

## Related live projects (watch for knowledge that should flow back)
- https://github.com/LambOfYasha/LOY-Tournament
- https://github.com/LambOfYasha/LOYSoftware
- https://www.lambofyeshu.life

## Toggle
State is sticky. One `[mpkb-off]` disables until `[mpkb-on]`. Default ON.
