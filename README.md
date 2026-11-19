# Asimangkan Boro · portfolio

A cinematic, responsive personal portfolio built with Next.js (App Router), TypeScript, CSS variables, one Three.js WebGL scene and the Web Audio API. Every mark, preview, landscape and sound is original and generated in code.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev                         # http://localhost:3000
npm run build                       # production build
npm run start                       # serve the build on :3000
```

Set `SITE_URL` when building for a real domain so canonical and social-preview URLs are absolute and correct:

```bash
SITE_URL=https://your-domain.example npm run build
```

No secrets or API keys are needed.

## Deploy

The site is fully static and deploys to [Vercel](https://vercel.com) with no extra setup. `vercel.json` pins the framework, install and build commands.

1. In Vercel, choose **Add New → Project** and import this GitHub repository. Keep the detected settings.
2. Under **Settings → Environment Variables**, add `SITE_URL` for the **Production** environment, set to the real domain with `https://` and no trailing slash, for example `https://asimangkanboro.com`.
3. Under **Settings → Domains**, add that same domain and follow Vercel's DNS instructions.
4. Redeploy so the new `SITE_URL` is baked into the build.

**`SITE_URL` must match the domain visitors use.** It sets the canonical links and the absolute URLs in social previews, and it is read at build time, so changing it needs a redeploy. If it is missing on Vercel, the build falls back to the project's `*.vercel.app` production hostname; anywhere else it falls back to `http://localhost:3000`, which breaks link previews.

Every push to `main` deploys to production, and every pull request gets a preview deployment.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. It installs with `npm ci`, then runs `npm run typecheck` and `npm run build`. The acceptance suite is not part of CI because it needs a locally installed Edge or Chrome.

## Edit content

All text, projects, roles, skills, links and overview captions live in one file:

```
src/content/portfolio.ts
```

Presentation lives in `src/components`, styling in `src/app/globals.css`.

### Résumé

No original PDF was supplied, so the site links to a printable HTML résumé at `/resume`, generated from the same content file. To use the original PDF, copy it to `public/resume.pdf` and set `person.resume` to `{ href: "/resume.pdf", label: "Résumé PDF", isPdf: true }`. The phone number from the PDF is intentionally not published on the site.

## Acceptance tests

The suite drives the production build in headless Microsoft Edge through `playwright-core` (no browser download).

```bash
npm run build
npm run start -- -p 3100            # in one terminal
npm run test:acceptance             # in another; BASE_URL defaults to http://localhost:3100
```

Use `BROWSER_CHANNEL=chrome` to run with Google Chrome instead. Screenshots and `report.json` are written to `test-results/`. Sound checks read Web Audio node values. They confirm routing, gain and timing, not how the mix sounds.

Useful manual switches:

- `/?gl=0` forces the static, non-WebGL fallback.
- The Reduce motion button in the header persists the visitor's choice, separately from sound.
- `/work/<slug>` opens a case study directly, for example `/work/jec-maps`.

## How it fits together

| Area | Where |
| --- | --- |
| Single animation clock | `src/lib/ticker.ts` |
| Scroll, pointer, hero descent, active section | `src/components/MotionSystem.tsx` |
| WebGL terrain, monogram glow, bending gallery planes | `src/lib/scene/scene.ts` |
| Project preview illustrations (canvas) | `src/lib/previews.ts` |
| AB monogram and project mark geometry | `src/lib/mark.ts` |
| Adaptive score and interface sound | `src/lib/audio/engine.ts`, `src/lib/audio/sound.ts` |
| Case-study routing, history, focus and scroll restoration | `src/lib/cases.ts`, `src/components/CaseLayer.tsx` |
| Overview player | `src/components/OverviewPlayer.tsx` |

Headings, navigation, project links, the direct case pages and contact are server-rendered. The renderer, audio engine and previews load in the browser after the text.

Asset credits are listed in `CREDITS.md`.
