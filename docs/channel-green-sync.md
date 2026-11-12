# Channel Green on this site

The ZeroTheory site has a Channel Green section at `/channel-green`. The game itself is developed in its own
open source repository, [Channel-Green](https://github.com/revanshsharma/Channel-Green). Open source changes
land there first. Once Revansh approves them, they are copied into this repository.

## What lives where

| Place | What it is | Edit by hand? |
| --- | --- | --- |
| `client/src/channel-green/` | A copy of the approved Channel Green code, art data, content and licence | No. It is overwritten by the sync script |
| `client/src/channel-green-site/` | This site's own pages for the section: front page, routing, "not connected" page, small Next.js stand-ins | Yes |
| `client/src/components/ChannelGreenTeaser.tsx` and the three lines in `pages/Home.tsx` | The home page nav entry and teaser | Yes |
| `scripts/sync-channel-green.sh`, `scripts/channel-green-scope-css.py` | The copy tools | Yes |
| `client/src/channel-green/UPSTREAM.txt` | Which Channel Green commit the copy came from | Written by the script |

Channel Green's licence (MIT) and credits are copied along with the code: `client/src/channel-green/LICENSE`
and `client/src/channel-green/ATTRIBUTIONS.md`. Keep them.

## Bringing in approved changes

1. In the Channel-Green repository, find the approved commit (or tag) and note it.
2. In this repository, on a new branch (never straight on `main`):

   ```
   git switch -c channel-green-sync-<short-commit>
   scripts/sync-channel-green.sh ../Channel-Green <commit>
   ```

   The first argument is where your Channel-Green checkout is, the second is the commit, tag or branch to copy.
   The script reads that commit only (uncommitted edits in the checkout are ignored), writes only inside
   `client/src/channel-green/`, and does not commit, push or deploy anything.
3. Read what it printed. If it lists files "ported by hand", Channel Green changed something that this site
   mirrors manually. Open the upstream file and update the matching site file:

   | Channel Green file | This site's version |
   | --- | --- |
   | `apps/web/src/components/landing/Landing.tsx` | `client/src/channel-green-site/Landing.tsx` |
   | `apps/web/src/app/play/page.tsx` | `client/src/channel-green-site/PlayRoute.tsx` |
   | `apps/web/src/app/layout.tsx` (fonts, title) | `client/src/channel-green-site/ChannelGreenPage.tsx` |
   | `apps/web/src/app/api/status/route.ts` | `useStatus` in `Landing.tsx` (asks the live server directly) |
   | `apps/web/src/app/globals.css` (colours and fonts only) | `client/src/channel-green-site/theme.css` |

   The stylesheet, the guidelines page and the credits page are copied automatically.
4. Check: `pnpm install`, `pnpm check`, `pnpm build`, then `pnpm dev` and look at `/channel-green`.
   New packages Channel Green needs (a new library) must be added to this repository's `package.json` too.
5. Commit, open a pull request, preview, merge.

What the script changes in the copied files, and nothing else: it removes the `'use client'` line (only
meaningful in Next.js) and renames the import prefix `@/` to `@cg/` (this site already uses `@/`).
`next/link` and `next/navigation` are answered by two small stand-ins in `client/src/channel-green-site/shims/`.

## The live server

The walking-around, chat and voice part needs the Channel Green realtime server. It is **not** part of this site
and is not hosted on Cloudflare. It runs separately (planned: Azure) and this site only needs its address.

- Set `VITE_REALTIME_URL` (see `.env.example`) in the Cloudflare project's build variables, or in a local `.env`.
  It is a public address, never put a key in it.
- On the server, `ALLOWED_ORIGINS` must include this site's address (the production domain and any preview
  address you want to test with), or browsers will refuse the connection.
- If `VITE_REALTIME_URL` is empty, the section says plainly that the live town is not connected yet and offers no
  game. Nothing pretends to work.
- Changing the address needs a new build, because it is baked into the site when it is built.

## Cloudflare

Nothing about Cloudflare changes: the section is part of the same static site (`pnpm build`, output in
`dist/public`), and `/channel-green` is served by the same single-page fallback that already serves the home page
for any address. If the project is a Workers static-assets deployment, that fallback is the
`single-page-application` not-found handling in its settings. The game files (Phaser, Socket.IO, voice) are loaded
only when someone opens `/channel-green` and chooses to walk in, so the home page does not get heavier.

## Known limits

- Voice and video need the server's LiveKit settings; they are optional and off by default.
- Saved accounts are not wired in on this site; visitors walk in as guests.
- Sound is off until a visitor turns it on.
