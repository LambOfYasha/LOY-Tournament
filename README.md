# LOY-Tournament
Streamlabs-ready FGC Tournament Overlay + Signup system for Tekken 8. Built for LOY Software (lambofyeshu.life). Realtime admin control, transparent OBS overlay, public player registration, offstream scoring, and a now-playing popup.

## Pages
- `/admin` — gothic Tournament Control Panel
- `/overlay` — OBS score overlay (existing IDs / `matchUpdate`)
- `/offstream` — check-in + dual-confirm score reports (`!report` / `!confirm`)
- `/nowplaying` — Panda Maiden now-playing popup (Suno / VLC / YouTube Music / Spotify)
- `/signup` — public registration

## Socket events (unchanged)
`adminUpdateMatch`, `incrementScore`, `resetScores`, `matchUpdate`, `signupsUpdate`

## New events / API
- Socket `botCommand` `{ login, display, isMod, text }` → `offstreamUpdate`, `botReply`
- Socket `nowPlayingPush` / `nowPlaying`
- `POST /api/bot` — hook for any custom Twitch bot
- `POST /api/nowplaying` `{ title, artist, source, cover }`

## Offstream commands
```
!checkin
!offstream @p1 @p2     (mod)
!report 2-1            (your games first)
!confirm               (opponent)
!dispute
!result @p1 2 @p2 1    (mod)
!cancel                (mod)
```
Both players must be signed up and checked in. A report does nothing until the opponent confirms. Locked scores push the stream overlay.

## Twitch bot
Optional. Set `TWITCH_CHANNEL` and `TWITCH_OAUTH` (`oauth:…`) and `npm i tmi.js`. The bridge lives in `bot/twitch.js` and forwards the same commands.

## Now Playing in OBS
Add a Browser Source pointed at `/nowplaying`. Push a track with:
```
POST /api/nowplaying
{ "title": "Velvet Reliquary", "artist": "Panda Maiden", "source": "suno" }
```
The card holds ~9 seconds then fades until the next push.
