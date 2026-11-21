# Asimangkan Boro · The Living Editorial

A personal portfolio built as a digital magazine that behaves like a small software lab. Editorial typography sets the tone. Four working demos show the projects. Next.js App Router, React and TypeScript, with no WebGL and no runtime dependencies beyond Next, React and the Geist fonts.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev                         # http://localhost:3000
npm run typecheck
npm run build                       # production build
npm run start                       # serve the build on :3000
```

Set `SITE_URL` when building for a real domain so canonical and social-preview URLs are absolute:

```bash
SITE_URL=https://your-domain.example npm run build
```

No secrets or API keys are needed.

## Edit content

Text, projects, roles, skills, links and credits live in one file:

```
src/content/portfolio.ts
```

`editorial` in that file holds the creative copy, such as the headline and statements. Everything else is factual and verified. The sample data used by the demos lives in `src/features/lab/data/` and is labelled as illustrative in the interface.

### Résumé

No original PDF was supplied, so the site links to a printable HTML résumé at `/resume`, generated from the content file. To use the original PDF, copy it to `public/resume.pdf` and set `person.resume` to `{ href: "/resume.pdf", label: "Résumé PDF", isPdf: true }`.

## How it fits together

| Area | Where |
| --- | --- |
| Page composition (server-rendered) | `src/components/Site.tsx` |
| Living Type headline | `src/components/editorial/LivingType.tsx` |
| Navigation and active-section indicator | `src/components/editorial/Nav.tsx` |
| Interactive lab (one lazy chunk per demo) | `src/features/lab/` |
| Case-study routing, history, focus and view transitions | `src/lib/cases.ts`, `src/components/CaseLayer.tsx` |
| Motion preference, reveals, header state, sound bridge | `src/components/PageSystems.tsx` |
| On-demand animation frames | `src/lib/motion/frame.ts` |
| Optional interface sound cues | `src/lib/audio/cues.ts` |
| Identity geometry | `src/lib/mark.ts`, `src/components/Marks.tsx` |
| Design system | `src/app/globals.css`, `src/features/lab/lab.css` |

Design rules the code follows:

- **The first paint is the real page.** There is no loader, and the headline reveal is pure CSS. All text, links and the initial state of every demo are server-rendered and readable without JavaScript.
- **Nothing animates while idle.** Animation frames run only while something is moving, such as a route being drawn, the headline easing back or the cursor label catching up. The acceptance suite measures this.
- **Demos tell the truth.** The JEC Maps demo computes real shortest paths over labelled demonstration geometry. The M-PHISH demo runs a few teaching rules on synthetic messages, and says it is not the M-PHISH engine. The Tender AI demo shows prewritten sample fields from fictional tenders. The Plugora demo is a booking simulation that reserves nothing.
- **Shared-element transitions** use the View Transitions API where available. Elsewhere the case study simply opens.
- **Sound is off by default** and limited to four short interface cues. Nothing plays on pointer movement or scrolling.

## Acceptance tests

The suite drives the production build in headless Microsoft Edge through `playwright-core`, so no browser download is needed.

```bash
npm run build
npm run start -- -p 3100            # in one terminal
npm run test:acceptance             # in another; BASE_URL defaults to http://localhost:3100
```

Use `BROWSER_CHANNEL=chrome` to run with Google Chrome. Screenshots and `report.json` are written to `test-results/`.

Asset credits are in `CREDITS.md`.
