# ALIWORLD

a persistent narrative world built around the music + mythology of danny ali / six5ive.

this repo hosts the umbrella web project at `play.dannyali.com`, which currently routes to two experiences:

- **BLNT** — the original album rollout gym-challenge game (lives at github.com/danny5ali/BLNT)
- **ALIWORLD** — the v1.1 MDNGHT POV-flip narrative rpg (lives in this repo at `/aliworld`)

future v2 work also lives in this repo.

## project structure

```
/                  the splash chooser (index.html + styles.css + router.js)
/aliworld          the v1.1 game (Phaser.js, filled in later steps)
/assets            shared static assets (logos, splash thumbs, marketing)
/db                supabase SQL migrations
/docs              specs, style bibles, build notes
/_redirects        cloudflare pages routing rules
/blnt-redirect.html the redirect page that sends /blnt → existing BLNT site
```

## quick links

- live site: https://play.dannyali.com
- v1 (BLNT) game: https://github.com/danny5ali/BLNT
- supabase project: (link added when set up)
- cloudflare project: (link added when set up)

## running locally

the splash chooser and aliworld are both static sites — no build step. open the HTML files directly in a browser, or run a simple static server:

```bash
# from repo root
python3 -m http.server 8000
```

then visit:
- http://localhost:8000 for the chooser
- http://localhost:8000/aliworld for the v1.1 game

## status

- [x] project scaffold
- [ ] splash chooser deployed
- [ ] supabase project + schema
- [ ] account creation + auth
- [ ] Phaser game skeleton
- [ ] customization scene
- [ ] combat system
- [ ] episodes 1-5
- [ ] launch
