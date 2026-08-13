# [nextjs-refactor] · [draft]

**Status:** parked reminder only — do not implement until this tag is invoked.
**Created:** 2026-08-13
**GitHub issue:** https://github.com/LambOfYasha/LOY-Tournament/issues/1

## How to come back

In any Grok session, type:

```
[nextjs-refactor]
```

That tag means: start refactoring LOY-Tournament into a proper Next.js app now. Preserve current functionality. Do not redesign first unless asked.

Compatible with existing reminder skills:
- `[draft]` — surfaces via mss-draft-reminder
- `[concept]` — optional weekly ping via mss-concept-weekly-reminder

## Scope when invoked

Move Express + static HTML + Socket.io to Next.js while keeping:

| Route | Purpose |
|-------|--------|
| `/overlay` | Transparent Streamlabs/OBS browser source |
| `/admin` | Realtime names, scores, round, characters |
| `/signup` | Tekken 8 public registration |

Also keep:
- Live match updates (Socket.io or equivalent)
- Persistence (file or DB)
- Domain: lambofyeshu.life / tournament.lambofyeshu.life
- Event-day hosting (Cloudflare Tunnel / VPS still valid)

## Current working stack (do not break until refactor starts)

- `server.js` — Express + Socket.io
- `public/admin.html`
- `public/overlay.html`
- `public/signup.html`
- `data/db.json`
