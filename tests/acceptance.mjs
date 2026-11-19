/**
 * Acceptance journeys for the portfolio, run against a production server.
 *
 *   npm run build && npm run start -- -p 3100
 *   npm run test:acceptance            (BASE_URL defaults to http://localhost:3100)
 *
 * Uses playwright-core with the locally installed Microsoft Edge (channel "msedge").
 * Set BROWSER_CHANNEL=chrome to use Google Chrome instead.
 * Set SKIP_EXTERNAL_LINKS=1 to skip the external link checks where outbound network is restricted.
 * These are automated checks. They do not replace listening tests for the mix.
 */
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL ?? "msedge";
const SKIP_EXTERNAL = process.env.SKIP_EXTERNAL_LINKS === "1";
const OUT = path.join(ROOT, "test-results");
mkdirSync(OUT, { recursive: true });

// The contact address is read from the single content file so the test checks what the site publishes.
const CONTENT = readFileSync(path.join(ROOT, "src", "content", "portfolio.ts"), "utf8");
const CONTACT = CONTENT.match(/\n  email: "([^"]+)"/)[1];
const SLUGS = ["jec-maps", "m-phish", "tender-ai", "plugora"];
const results = [];
const consoleErrors = [];
let current = "";

function check(name, ok, detail = "") {
  results.push({ journey: current, name, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail !== "" ? `  (${detail})` : ""}`);
}
function journey(name) {
  current = name;
  console.log(`\n== ${name}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  channel: CHANNEL,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

async function newPage(opts = {}, { trackErrors = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  await ctx.addInitScript(() => {
    // Record when the loader releases, relative to navigation start.
    const poll = () => {
      if (document.documentElement?.classList.contains("loaded")) {
        window.__loadedAt = performance.now();
        return;
      }
      setTimeout(poll, 10);
    };
    poll();
  });
  const page = await ctx.newPage();
  if (trackErrors) {
    page.on("pageerror", (e) => consoleErrors.push(`${current}: pageerror ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(`${current}: ${m.text()}`);
    });
  }
  return { ctx, page };
}

const loaded = (page, timeout = 9000) => page.waitForFunction(() => document.documentElement.classList.contains("loaded"), null, { timeout });
const audio = (page) => page.evaluate(() => (window.__abAudio ? window.__abAudio() : { state: "no-bridge" }));
const scene = (page) => page.evaluate(() => (window.__abScene ? window.__abScene() : null));
const html = (page) => page.evaluate(() => document.documentElement.className);

async function sample(page, fn, ms, every = 40) {
  const values = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    values.push(await page.evaluate(fn));
    await sleep(every);
  }
  return values;
}

try {
  /* ------------------------------------------------------------------ 1 */
  journey("1. Cold desktop visit");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const loaderFoot = await page.locator(".loader-foot").innerText();
    check("Loader shows name and role while loading", /Asimangkan Boro/.test(loaderFoot) && /Software developer/.test(loaderFoot));
    check("Loader offers one-action project and résumé links", (await page.locator('.loader-foot a[href="#work"]').count()) === 1 && (await page.locator('.loader-foot a[href="/resume"]').count()) === 1);
    const pct = await page.locator(".loader-pct").innerText();
    check("Loader reports progress", /\d+%|^$/.test(pct), pct);
    await page.screenshot({ path: `${OUT}/1-loader.png` });
    await loaded(page);
    await page.waitForFunction(() => window.__loadedAt, null, { timeout: 2000 }).catch(() => {});
    const coldMs = await page.evaluate(() => Math.round(window.__loadedAt ?? -1));
    check("Cold loader released", coldMs > 0 && coldMs < 6500, `${coldMs} ms`);
    const ssr = await (await fetch(BASE)).text();
    check("Headline, nav, projects and contact are server-rendered", ["Software developer from Assam.", 'href="#work"', "JEC Maps / JECVERSE", "M-PHISH", "Tender AI", "Plugora", `mailto:${CONTACT}`, 'href="/resume"'].every((s) => ssr.includes(s)));
    await sleep(1200);
    check("WebGL scene active", (await html(page)).includes(" gl"), await html(page));
    const a0 = await audio(page);
    check("Silent entry: no AudioContext before a gesture", a0.state === "none", a0.state);
    check("Sound control reads Sound off", (await page.locator(".sound-btn").innerText()).includes("Sound off"));
    await page.mouse.move(720, 600);
    await sleep(500);
    await page.screenshot({ path: `${OUT}/1-hero-desktop.png` });
    // warm visit
    await page.reload({ waitUntil: "domcontentloaded" });
    await loaded(page);
    await page.waitForFunction(() => window.__loadedAt, null, { timeout: 2000 }).catch(() => {});
    const warmMs = await page.evaluate(() => Math.round(window.__loadedAt ?? -1));
    check("Warm visit dismisses within ~1.5 s", warmMs > 0 && warmMs <= 1700, `${warmMs} ms`);
    await ctx.close();

    // failing 3D requests must not block navigation
    const blocked = await newPage({}, { trackErrors: false });
    let afterLoad = false;
    blocked.page.on("load", () => (afterLoad = true));
    let aborted = 0;
    await blocked.ctx.route("**/_next/static/chunks/**", (route) => {
      if (afterLoad) {
        aborted++;
        return route.abort();
      }
      return route.continue();
    });
    await blocked.page.goto(BASE, { waitUntil: "load" });
    await loaded(blocked.page, 8000).catch(() => {});
    const cls = await html(blocked.page);
    check("Loader releases when lazy 3D chunk fails", cls.includes("loaded"), `${aborted} requests aborted`);
    check("Static poster stays when 3D fails", !cls.includes(" gl"));
    await blocked.page.click('#site-nav a[href="#work"]');
    await sleep(300);
    const top = await blocked.page.evaluate(() => Math.round(document.getElementById("work").getBoundingClientRect().top));
    check("Navigation still works without 3D", Math.abs(top) <= 2, `#work top ${top}px`);
    await blocked.ctx.close();
  }

  /* ------------------------------------------------------------------ 2 */
  journey("2. Scroll, fling, reverse, settle, hash links");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await loaded(page);
    await sleep(1000);
    await page.mouse.move(720, 450);
    const hp = [];
    for (let i = 0; i < 18; i++) {
      await page.mouse.wheel(0, 90);
      await sleep(70);
      hp.push(await page.evaluate(() => getComputedStyle(document.getElementById("top")).getPropertyValue("--copy-o")));
    }
    const copyO = hp.map(Number);
    check("Hero copy fades monotonically during slow descent", copyO.every((v, i) => i === 0 || v <= copyO[i - 1] + 1e-3) && copyO.at(-1) < copyO[0], copyO.map((v) => v.toFixed(2)).join(" "));
    await page.evaluate(() => window.scrollTo(0, document.getElementById("top").offsetHeight - innerHeight));
    await sleep(500);
    const intro = await page.evaluate(() => Number(getComputedStyle(document.getElementById("top")).getPropertyValue("--intro-o")));
    check("Introduction revealed at end of descent", intro > 0.95, intro);
    await page.screenshot({ path: `${OUT}/2-descent-end.png` });

    await page.evaluate(() => window.scrollTo(0, document.getElementById("work").offsetTop - 200));
    await sleep(700);
    const down = [];
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 260);
      await sleep(16);
      down.push((await scene(page))?.bend ?? 0);
    }
    const minBend = Math.min(...down);
    check("Fast downward scroll bends gallery planes (negative)", minBend < -0.01, minBend.toFixed(4));
    check("Bend is bounded (≤ 5% of card height)", Math.abs(minBend) <= 0.0501, minBend.toFixed(4));
    await page.screenshot({ path: `${OUT}/2-gallery-bend.png` });
    const t0 = Date.now();
    let settledAt = -1;
    while (Date.now() - t0 < 1500) {
      const s = await scene(page);
      if (s && Math.abs(s.bend) < 0.0005) {
        settledAt = Date.now() - t0;
        break;
      }
      await sleep(25);
    }
    check("Bend settles after movement stops", settledAt >= 0 && settledAt < 700, `${settledAt} ms`);
    const up = [];
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -260);
      await sleep(16);
      up.push((await scene(page))?.bend ?? 0);
    }
    // Slow frames can land the peak just after the wheel burst, so keep sampling briefly.
    up.push(...(await sample(page, () => window.__abScene?.()?.bend ?? 0, 300)));
    check("Upward scroll reverses curvature (positive)", Math.max(...up) > 0.01, Math.max(...up).toFixed(4));
    await sleep(800);
    const s2 = await scene(page);
    const vis = (s2?.planes ?? []).filter((p) => p.visible);
    const aligned = vis.every((p) => Math.abs(p.dx) < 1 && Math.abs(p.dy) < 1 && Math.abs(p.dw) < 1 && Math.abs(p.dh) < 1);
    check("Settled planes align to DOM posters on all edges", vis.length > 0 && aligned && Math.abs(s2.bend) < 0.0005, JSON.stringify(vis));

    for (const id of ["skills", "about", "contact", "work"]) {
      await page.click(`#site-nav a[href="#${id}"]`);
      const bends = await sample(page, () => (window.__abScene ? Math.abs(window.__abScene().bend) : 0), 300);
      const top = await page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), id);
      await sleep(250);
      const cur = await page.evaluate(() => document.querySelector("#site-nav a[aria-current=true]")?.getAttribute("href"));
      check(`Hash #${id}: instant landing, no bend spike, active nav`, Math.abs(top) <= 2 && Math.max(...bends) < 0.005 && cur === `#${id}`, `top ${top}, max bend ${Math.max(...bends).toFixed(4)}, current ${cur}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);
    const back = await page.evaluate(() => Number(getComputedStyle(document.getElementById("top")).getPropertyValue("--copy-o")));
    check("Reverse scroll restores hero copy", back > 0.99, back);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 3 */
  journey("3. Case study from gallery, Escape, Back, direct URL");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await loaded(page);
    const link = page.locator('[data-case-link="jec-maps"]');
    // Centre the link first so the click itself does not scroll the page.
    await page.evaluate(() => document.querySelector('[data-case-link="jec-maps"]').scrollIntoView({ block: "center" }));
    await sleep(1200);
    // Record the scroll position at the moment the visitor presses, which is what must be restored.
    await page.evaluate(() => window.addEventListener("pointerdown", () => (window.__yAtPress = scrollY), { capture: true, once: true }));
    await link.click();
    const y0 = await page.evaluate(() => window.__yAtPress);
    await page.waitForSelector('[role="dialog"]');
    await sleep(300);
    check("URL becomes /work/jec-maps", new URL(page.url()).pathname === "/work/jec-maps", page.url());
    check("Dialog is named by the case title", (await page.locator('[role="dialog"]').getAttribute("aria-labelledby")) === "case-title" && (await page.locator("#case-title").innerText()) === "JEC Maps / JECVERSE");
    check("Document title follows the case", (await page.title()).startsWith("JEC Maps / JECVERSE"), await page.title());
    check("Focus moves into the dialog", await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')));
    let trapped = true;
    const visited = new Set();
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => ({ inside: !!document.activeElement?.closest('[role="dialog"]'), label: document.activeElement?.textContent?.trim().slice(0, 30) }));
      if (!info.inside) trapped = false;
      visited.add(info.label);
    }
    check("Tab stays trapped inside the dialog", trapped, [...visited].join(" | "));
    check("Page behind is inert", (await page.locator("#page").getAttribute("inert")) !== null);
    await page.screenshot({ path: `${OUT}/3-case-desktop.png` });
    await page.keyboard.press("Escape");
    await sleep(300);
    check("Escape closes the case", (await page.locator('[role="dialog"]').count()) === 0);
    check("URL returns to /", new URL(page.url()).pathname === "/", page.url());
    const y1 = await page.evaluate(() => scrollY);
    check("Gallery scroll position restored exactly", Math.abs(y1 - y0) <= 1, `${y0} → ${y1}`);
    check("Focus returns to the View case link", await page.evaluate(() => document.activeElement?.getAttribute("data-case-link") === "jec-maps"));

    await link.click();
    await page.waitForSelector('[role="dialog"]');
    await page.goBack();
    await sleep(400);
    check("Browser Back closes the case", (await page.locator('[role="dialog"]').count()) === 0 && new URL(page.url()).pathname === "/");
    check("Back restores scroll position", Math.abs((await page.evaluate(() => scrollY)) - y1) <= 1);
    await page.goForward();
    await sleep(400);
    check("Forward reopens the case", (await page.locator("#case-title").count()) === 1 && new URL(page.url()).pathname === "/work/jec-maps");
    await page.click(".case-next");
    await sleep(300);
    check("Next case swaps in place with its own URL", new URL(page.url()).pathname === "/work/m-phish" && (await page.locator("#case-title").innerText()) === "M-PHISH");
    await page.click(".case-close");
    await sleep(300);
    check("Close after switching returns to gallery", (await page.locator('[role="dialog"]').count()) === 0 && new URL(page.url()).pathname === "/");
    await ctx.close();

    const raw = await (await fetch(`${BASE}/work/jec-maps`)).text();
    check("Direct case URL is server-rendered with the dialog", raw.includes('role="dialog"') && raw.includes("JEC Maps / JECVERSE") && raw.includes("<title>JEC Maps / JECVERSE · Asimangkan Boro</title>"));
    const d = await newPage();
    await d.page.goto(`${BASE}/work/jec-maps`);
    await d.page.waitForSelector("#case-title");
    check("Direct entry skips the loader", (await d.page.locator(".loader").count()) === 0);
    await d.page.reload();
    await d.page.waitForSelector("#case-title");
    check("Refresh keeps the case open", new URL(d.page.url()).pathname === "/work/jec-maps");
    await d.page.waitForFunction(() => window.__abCaseAdopted === true, null, { timeout: 5000 });
    await d.page.goBack();
    await sleep(500);
    const afterBack = await d.page.evaluate(() => ({ path: location.pathname, hash: location.hash, top: Math.round(document.getElementById("work").getBoundingClientRect().top), open: !!document.querySelector('[role="dialog"]') }));
    check("Back from a direct case lands on #work", !afterBack.open && afterBack.path === "/" && afterBack.hash === "#work" && Math.abs(afterBack.top) <= 2, JSON.stringify(afterBack));
    await d.page.goto(`${BASE}/work/plugora`);
    await d.page.waitForSelector("#case-title");
    await d.page.waitForFunction(() => window.__abCaseAdopted === true, null, { timeout: 5000 });
    await sleep(300);
    await d.page.click(".case-close");
    await sleep(500);
    const afterClose = await d.page.evaluate(() => ({ path: location.pathname, hash: location.hash, top: Math.round(document.getElementById("work").getBoundingClientRect().top), focus: document.activeElement?.id }));
    check("Closing a direct case goes to #work and focuses it", afterClose.path === "/" && afterClose.hash === "#work" && Math.abs(afterClose.top) <= 2 && afterClose.focus === "work-title", JSON.stringify(afterClose));
    await d.ctx.close();
    const bad = await fetch(`${BASE}/work/not-a-case`);
    check("Unknown case URL returns 404", bad.status === 404, bad.status);
  }

  /* ------------------------------------------------------------------ 4 */
  journey("4. Sound (automated signal checks, not a listening test)");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await loaded(page);
    await sleep(600);
    await page.mouse.move(100, 400);
    for (let x = 100; x < 1300; x += 120) await page.mouse.move(x, 400);
    await page.mouse.wheel(0, 800);
    await sleep(300);
    check("Sound disabled: interactions create no audio", (await audio(page)).state === "none");
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(300);

    await page.click(".sound-btn");
    await page.waitForFunction(() => window.__abAudio?.().state === "running", null, { timeout: 5000 }).catch(() => {});
    await sleep(1500);
    let a = await audio(page);
    check("Sound on after explicit click", a.state === "running" && a.enabled === true && a.master > 0.2, JSON.stringify({ state: a.state, master: a.master }));
    check("Control reflects real state", (await page.locator(".sound-btn").getAttribute("aria-pressed")) === "true" && (await page.locator(".sound-btn").innerText()).includes("Sound on"));
    check("Hero mix: ground + pad + bells", a.layers?.ground > 0.4 && a.layers?.pad > 0.4 && a.layers?.bells > 0.4, JSON.stringify(a.layers));

    await page.mouse.move(700, 450);
    // The envelope decays on the animation clock, which runs slower than wall time on slow frames.
    // Wait up to 2 s for it to go quiet rather than reading it once.
    let still = 1;
    const quietBy = Date.now() + 2000;
    await sleep(600);
    while (Date.now() < quietBy) {
      still = (await audio(page)).move;
      if (still < 0.01) break;
      await sleep(50);
    }
    check("Stationary pointer: movement layer silent", still < 0.01, still?.toFixed(4));
    const sweep = [];
    for (let i = 0; i < 24; i++) {
      await page.mouse.move(100 + (i % 2 ? 1200 : 0), 450, { steps: 4 });
      sweep.push((await audio(page)).move);
    }
    check("Fast horizontal sweep raises the movement envelope", Math.max(...sweep) > 0.05, Math.max(...sweep).toFixed(3));
    check("Pointer layer stays below the bed (envelope ≤ 0.55)", Math.max(...sweep) <= 0.56, Math.max(...sweep).toFixed(3));
    await sleep(1200);
    const idle = (await audio(page)).move;
    check("Idle decay after movement", idle < 0.01, idle.toFixed(4));
    await page.mouse.move(700, 20, { steps: 6 });
    await sleep(900);
    const topCut = (await audio(page)).airCutoff;
    await page.mouse.move(700, 890, { steps: 6 });
    await sleep(900);
    const botCut = (await audio(page)).airCutoff;
    check("Vertical pointer maps air cutoff ≈1.2 kHz top → 450 Hz bottom", topCut > 1050 && botCut < 520, `${Math.round(topCut)} Hz → ${Math.round(botCut)} Hz`);

    const slow = [];
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 30);
      await sleep(90);
      slow.push((await audio(page)).scroll);
    }
    const fast = [];
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 300);
      await sleep(16);
      fast.push((await audio(page)).scroll);
    }
    check("Fast scroll is louder than slow scroll", Math.max(...fast) > Math.max(...slow) * 2 && Math.max(...fast) > 0.03, `slow ${Math.max(...slow).toFixed(3)} fast ${Math.max(...fast).toFixed(3)}`);
    await sleep(1500);
    check("Scroll layer fades back after a pass", (await audio(page)).scroll < 0.01);
    await page.click('#site-nav a[href="#contact"]');
    await sleep(300);
    const jump = (await audio(page)).scroll;
    check("Anchor jump does not trigger a scroll whoosh", jump < 0.01, jump.toFixed(4));

    await sleep(2200);
    a = await audio(page);
    check("Contact reintroduces bells and pulse", a.section === "contact" && a.layers.pulse > 0.25 && a.layers.bells > 0.35, JSON.stringify(a.layers));
    await page.click('#site-nav a[href="#work"]');
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, i % 2 ? -400 : 400);
      await sleep(40);
    }
    await sleep(2400);
    a = await audio(page);
    check("Work thins bells", a.section === "work" && a.layers.bells < 0.2, `${a.section} ${JSON.stringify(a.layers)}`);

    const link = page.locator('[data-case-link="m-phish"]');
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await sleep(1600);
    a = await audio(page);
    check("Case reading drops bells further", a.section === "case" && a.layers.bells < 0.1, JSON.stringify(a.layers));
    await page.keyboard.press("Escape");
    await sleep(400);

    const voices = [];
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(300);
    const navBoxes = await page.locator("#site-nav a").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.x + r.width / 2, r.y + r.height / 2]));
    for (let i = 0; i < 40; i++) {
      const [x, y] = navBoxes[i % navBoxes.length];
      await page.mouse.move(x, y);
      voices.push((await audio(page)).shortVoices);
    }
    check("Sweeping controls never piles up short voices (cap 10)", Math.max(...voices) <= 10, `max ${Math.max(...voices)}`);

    await page.mouse.move(10, 10);
    await page.click(".play-overview");
    await page.waitForSelector(".overview-panel");
    await sleep(900);
    a = await audio(page);
    check("Overview fades page music down and takes its own bus", a.music < 0.1 && a.overview > 0.8, `music ${a.music.toFixed(3)} overview ${a.overview.toFixed(3)}`);
    const cap1 = await page.locator(".overview-caption").innerText();
    await sleep(3200);
    const cap2 = await page.locator(".overview-caption").innerText();
    check("Overview advances with visible captions", cap1 !== cap2 && cap2.includes("JEC Maps"), `${cap1} → ${cap2}`);
    await page.screenshot({ path: `${OUT}/4-overview.png` });
    await page.click(".overview-controls button:first-child");
    await sleep(500);
    check("Overview pause silences its bus", (await audio(page)).overview < 0.2);
    await page.keyboard.press("Escape");
    await sleep(1600);
    a = await audio(page);
    check("Closing overview restores the page mix", a.music > 0.8 && a.overview < 0.05 && a.enabled, `music ${a.music.toFixed(3)}`);
    check("Focus returns to Play overview", await page.evaluate(() => document.activeElement?.hasAttribute("data-overview-trigger")));

    await page.click(".vol-btn");
    await page.evaluate(() => {
      const r = document.querySelector('.volume-pop input[type="range"]');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      set.call(r, "20");
      r.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await sleep(800);
    a = await audio(page);
    check("Volume slider sets master gain", Math.abs(a.master - 0.2 * 0.85) < 0.03, a.master.toFixed(3));
    check("Volume remembered", (await page.evaluate(() => localStorage.getItem("ab.volume"))) === "0.20");
    await page.keyboard.press("Escape");

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await sleep(800);
    check("Hidden tab suspends processing", (await audio(page)).state === "suspended", (await audio(page)).state);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await sleep(900);
    check("Visible again restores permitted playback", (await audio(page)).state === "running");

    await page.click(".sound-btn");
    await sleep(900);
    a = await audio(page);
    check("Sound off mutes and suspends", !a.enabled && a.master < 0.02 && a.state === "suspended", `${a.state} ${a.master.toFixed(3)}`);
    check("Mute preference stored", (await page.evaluate(() => localStorage.getItem("ab.sound"))) === "off");
    await page.click(".sound-btn");
    await sleep(600);
    await page.reload();
    await loaded(page);
    await sleep(300);
    check("Remembered sound waits for a gesture after reload", (await page.locator(".sound-btn").innerText()).includes("Resume sound") && (await audio(page)).state === "none");
    await page.mouse.click(700, 700);
    await sleep(1500);
    check("First gesture resumes remembered sound", (await audio(page)).state === "running" && (await page.locator(".sound-btn").innerText()).includes("Sound on"));
    await page.click(".sound-btn");
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 5 */
  journey("5. Phones, keyboard, reduced motion, WebGL fallback");
  for (const vp of [
    { width: 390, height: 844, name: "390" },
    { width: 360, height: 740, name: "360" },
  ]) {
    const { ctx, page } = await newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(BASE);
    await loaded(page);
    await sleep(800);
    await page.screenshot({ path: `${OUT}/5-hero-${vp.name}.png` });
    const overflow = [];
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += vp.height * 0.8) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await sleep(60);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 0) overflow.push(`${Math.round(y)}:${o}`);
    }
    check(`${vp.name}px: no horizontal overflow`, overflow.length === 0, overflow.join(" "));
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(300);
    const play = await page.locator(".play-overview").boundingBox();
    check(`${vp.name}px: Play overview visible and ≥44 px`, play && play.height >= 44 && play.x >= 0 && play.x + play.width <= vp.width && (await page.locator(".play-overview").innerText()).includes("Play overview"), JSON.stringify(play));
    const links = await page.locator(".hero-links a").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ t: r.top, b: r.bottom, l: r.left, r: r.right })));
    const dock = await page.locator(".sound-dock").boundingBox();
    const clash = links.some((r) => !(r.b <= dock.y || r.t >= dock.y + dock.height || r.r <= dock.x || r.l >= dock.x + dock.width));
    check(`${vp.name}px: fixed sound control does not cover hero links`, !clash);
    const markBox = await page.locator("[data-mark-box]").boundingBox();
    const copyBox = await page.locator(".hero-copy").boundingBox();
    check(`${vp.name}px: monogram and headline do not overlap`, markBox.y + markBox.height <= copyBox.y + 2, `mark bottom ${Math.round(markBox.y + markBox.height)}, copy top ${Math.round(copyBox.y)}`);
    await page.tap(".menu-btn");
    await sleep(200);
    check(`${vp.name}px: menu opens with Work, Skills, About, Contact`, (await page.locator("#site-nav").isVisible()) && (await page.locator("#site-nav a").allInnerTexts()).join(",") === "Work,Skills,About,Contact");
    await page.screenshot({ path: `${OUT}/5-menu-${vp.name}.png` });
    await page.tap('#site-nav a[href="#work"]');
    await sleep(400);
    check(`${vp.name}px: menu link navigates and closes menu`, !(await page.locator("#site-nav").isVisible()) && (await page.evaluate(() => location.hash)) === "#work");
    const lefts = await page.locator(".work-grid article").evaluateAll((els) => els.map((e) => [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top), e.querySelector("h3").textContent]));
    check(`${vp.name}px: single-column gallery in project order`, lefts.every((l) => l[0] === lefts[0][0]) && lefts.every((l, i) => i === 0 || l[1] > lefts[i - 1][1]) && lefts.map((l) => l[2]).join("|") === "JEC Maps / JECVERSE|M-PHISH|Tender AI|Plugora");
    await page.screenshot({ path: `${OUT}/5-work-${vp.name}.png` });
    const view = page.locator('[data-case-link="tender-ai"]');
    await view.scrollIntoViewIfNeeded();
    await view.tap();
    await page.waitForSelector(".case-panel");
    await sleep(500);
    const sheet = await page.locator(".case-panel").boundingBox();
    const scrollable = await page.locator(".case-panel").evaluate((e) => e.scrollHeight > e.clientHeight);
    check(`${vp.name}px: case opens as a full-height reading sheet with its own scroll`, Math.round(sheet.x) === 0 && Math.round(sheet.width) === vp.width && Math.round(sheet.height) === vp.height && scrollable, JSON.stringify(sheet));
    await page.screenshot({ path: `${OUT}/5-case-${vp.name}.png` });
    const closeBox = await page.locator(".case-close").boundingBox();
    check(`${vp.name}px: Close button ≥44 px`, closeBox.height >= 44 && closeBox.width >= 44);
    await page.tap(".case-close");
    await sleep(300);
    for (const id of ["skills", "experience", "contact"]) {
      await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
      await sleep(900);
      await page.screenshot({ path: `${OUT}/5-${id}-${vp.name}.png` });
    }
    const email = await page.locator(".email-big").boundingBox();
    check(`${vp.name}px: email fits the viewport`, email.x >= 0 && email.x + email.width <= vp.width, JSON.stringify(email));
    check(`${vp.name}px: résumé reachable from contact`, (await page.locator('.contact-links a[href="/resume"]').count()) === 1);
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#page a[href], #page button"))
        .filter((e) => e.offsetParent !== null && !e.closest(".capsule") && !e.classList.contains("poster-link") && !e.closest(".credits li"))
        .map((e) => [e.textContent.trim().slice(0, 24), Math.round(e.getBoundingClientRect().height)])
        .filter(([, h]) => h > 0 && h < 44),
    );
    check(`${vp.name}px: touch targets ≥44 px tall (inline prose terms excepted)`, small.every(([t]) => ["campus navigation", "student developers", "college sports"].includes(t)), JSON.stringify(small));
    check(`${vp.name}px: no custom cursor on touch`, !(await html(page)).includes("cursor"));
    await ctx.close();
  }

  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await loaded(page);
    await page.keyboard.press("Tab");
    check("First Tab reaches the skip link", (await page.evaluate(() => document.activeElement?.className)) === "skip-link");
    await page.keyboard.press("Enter");
    await sleep(200);
    check("Skip link moves focus to main", (await page.evaluate(() => document.activeElement?.id)) === "main");
    let reachedTerm = false;
    let reachedCase = false;
    for (let i = 0; i < 60 && !reachedCase; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => ({ cls: document.activeElement?.className, slug: document.activeElement?.getAttribute("data-case-link"), outline: getComputedStyle(document.activeElement).outlineStyle }));
      if (info.cls === "term" && !reachedTerm) {
        reachedTerm = true;
        const shown = await page.evaluate(() => {
          const t = document.activeElement;
          const cap = document.getElementById(t.getAttribute("aria-controls"));
          return !cap.hidden && t.getAttribute("aria-expanded") === "true";
        });
        check("Keyboard focus reveals the evidence capsule", shown);
        await page.screenshot({ path: `${OUT}/5-capsule-focus.png` });
        await page.keyboard.press("Escape");
        check("Escape dismisses the capsule", await page.evaluate(() => document.querySelector(".term[aria-expanded=true]") === null));
      }
      if (info.slug) {
        reachedCase = true;
        check("Focus ring is visible on View case", info.outline !== "none", info.outline);
        await page.keyboard.press("Enter");
        await page.waitForSelector('[role="dialog"]');
        await sleep(200);
        check("Enter opens case from keyboard", (await page.locator("#case-title").count()) === 1);
        await page.keyboard.press("Escape");
        await sleep(300);
        check("Keyboard focus restored after Escape", await page.evaluate(() => !!document.activeElement?.getAttribute("data-case-link")));
      }
    }
    check("Tab order reaches About terms and a View case link", reachedTerm && reachedCase);
    await page.locator(".term").first().scrollIntoViewIfNeeded();
    await page.locator(".term").first().click();
    check("Term toggles as a labelled disclosure on click", (await page.locator(".term").first().getAttribute("aria-expanded")) === "true");
    await page.mouse.click(5, 450);
    await sleep(200);
    check("Outside click dismisses the capsule", (await page.locator(".term").first().getAttribute("aria-expanded")) === "false");
    await ctx.close();
  }

  {
    const { ctx, page } = await newPage({ reducedMotion: "reduce" });
    await page.goto(BASE);
    await loaded(page);
    await sleep(1500);
    const cls = await html(page);
    check("System reduced motion honoured", cls.includes("reduce") && !cls.includes(" gl") && !cls.includes("cursor"), cls);
    const hero = await page.evaluate(() => ({ pos: getComputedStyle(document.querySelector(".hero-sticky")).position, track: document.getElementById("top").offsetHeight, content: document.querySelector(".hero-sticky").offsetHeight }));
    check("Reduced: static hero, no scroll-driven track", hero.pos === "relative" && hero.track === hero.content, JSON.stringify(hero));
    check("Reduced: introduction visible immediately", await page.evaluate(() => getComputedStyle(document.querySelector(".hero-intro")).opacity === "1"));
    await page.evaluate(() => document.getElementById("work").scrollIntoView());
    await sleep(200);
    check("Reduced: cards stable and visible", await page.evaluate(() => Array.from(document.querySelectorAll(".card-caption, .poster")).every((e) => getComputedStyle(e).opacity === "1")));
    check("Reduced: no pause buttons on static previews", (await page.locator(".poster-pause").count()) === 0);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${OUT}/5-reduced-hero.png` });
    await ctx.close();
  }

  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await loaded(page);
    await sleep(1000);
    await page.click("#site-nav .motion-toggle");
    await sleep(500);
    check("Reduce motion toggle disables the scene", (await html(page)).includes("reduce") && !(await html(page)).includes(" gl"));
    await page.reload();
    await loaded(page);
    await sleep(800);
    check("Reduce motion setting persists", (await html(page)).includes("reduce") && (await page.locator("#site-nav .motion-toggle").getAttribute("aria-pressed")) === "true");
    await page.click("#site-nav .motion-toggle");
    await sleep(1500);
    check("Turning motion back on restarts the scene", (await html(page)).includes(" gl") && (await html(page)).includes("motion"));
    check("Sound preference untouched by motion setting", (await page.evaluate(() => localStorage.getItem("ab.sound"))) === null);
    await ctx.close();
  }

  {
    const { ctx, page } = await newPage();
    await page.goto(`${BASE}/?gl=0`);
    await loaded(page);
    await sleep(800);
    check("Forced fallback: no WebGL", !(await html(page)).includes(" gl"));
    check("Fallback posters visible", await page.evaluate(() => Array.from(document.querySelectorAll(".poster-canvas")).every((c) => getComputedStyle(c).opacity === "1")));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${OUT}/5-fallback-hero.png` });
    let opened = 0;
    for (const slug of SLUGS) {
      const l = page.locator(`[data-case-link="${slug}"]`);
      await l.scrollIntoViewIfNeeded();
      await l.click();
      await page.waitForSelector("#case-title", { timeout: 3000 }).catch(() => {});
      if (new URL(page.url()).pathname === `/work/${slug}`) opened++;
      await page.keyboard.press("Escape");
      await sleep(250);
    }
    check("Fallback visitor reaches all four case studies", opened === 4, `${opened}/4`);
    await page.evaluate(() => document.getElementById("work").scrollIntoView());
    await sleep(900);
    await page.screenshot({ path: `${OUT}/5-fallback-work.png` });
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 6 */
  journey("6. Content, links, résumé, clipboard");
  {
    const home = await (await fetch(BASE)).text();
    const text = home.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
    for (const s of ["JEC Maps / JECVERSE", "M-PHISH", "Tender AI", "Plugora"]) check(`Project present: ${s}`, text.includes(s));
    check("Exactly four project cards", (home.match(/<article/g) ?? []).length === 4);
    check("Internship dates Jul–Aug 2026", text.includes("Software Development Intern") && text.includes("Frint.in") && text.includes("Jul–Aug 2026"));
    check("Both schools", text.includes("Jorhat Engineering College") && text.includes("Sai Vikash Vidya Niketan") && text.includes("2021–2023"));
    check("Leadership roles", ["GDG on Campus JEC", "General Sports Secretary", "2026–2027", "IIT Guwahati Spirit", "Club Advisor", "GLUG-JEC"].every((s) => text.includes(s)));
    check("Contact address and mailto", text.includes(CONTACT) && home.includes(`href="mailto:${CONTACT}"`));
    check("No invented metrics or testimonials", !/testimonial|accuracy|users served|downloads|award/i.test(text));
    const hrefs = new Set();
    for (const p of ["/", ...SLUGS.map((s) => `/work/${s}`)]) {
      const h = await (await fetch(BASE + p)).text();
      for (const m of h.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"/g)) hrefs.add(m[1].replace(/&amp;/g, "&"));
    }
    if (SKIP_EXTERNAL) console.log(`  SKIP  ${hrefs.size} external link checks (SKIP_EXTERNAL_LINKS=1)`);
    for (const href of SKIP_EXTERNAL ? [] : hrefs) {
      let status = 0;
      try {
        status = (await fetch(href, { redirect: "follow" })).status;
      } catch (e) {
        status = String(e.cause?.code ?? e.message);
      }
      check(`External link responds: ${href}`, typeof status === "number" && status < 400, status);
    }
    const r = await fetch(`${BASE}/resume`);
    const rt = await r.text();
    check("Printable résumé view serves", r.status === 200 && rt.includes("Asimangkan Boro") && rt.includes(CONTACT) && rt.includes("Print or save as PDF"));
    check("No invented résumé PDF URL", !/\.pdf"/i.test(home));
    for (const p of ["/icon.svg", "/opengraph-image"]) check(`Asset serves: ${p}`, (await fetch(BASE + p)).status === 200);
    check("Home has title and description", /<title>Asimangkan Boro · Software developer from Assam<\/title>/.test(home) && /<meta name="description"/.test(home));
    check("Per-case metadata", (await (await fetch(`${BASE}/work/m-phish`)).text()).includes('<meta name="description" content="M-PHISH:'));

    const ok = await newPage();
    await ok.ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await ok.page.goto(`${BASE}/#contact`);
    await loaded(ok.page);
    await ok.page.click(".copy-row button");
    await sleep(300);
    const status = await ok.page.locator(".copy-status").innerText();
    const clip = await ok.page.evaluate(() => navigator.clipboard.readText());
    check("Copy succeeds and is announced politely", status.includes("Email copied") && clip === CONTACT && (await ok.page.locator(".copy-status").getAttribute("aria-live")) === "polite", status);
    await ok.ctx.close();
    const bad = await newPage();
    await bad.ctx.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
      document.execCommand = () => false;
    });
    await bad.page.goto(`${BASE}/#contact`);
    await loaded(bad.page);
    await bad.page.click(".copy-row button");
    await sleep(300);
    const fail = await bad.page.locator(".copy-status").innerText();
    check("Copy failure shows a visible fallback", fail.includes("Couldn’t copy") && fail.includes(CONTACT), fail);
    await bad.ctx.close();
  }

  journey("7. Console");
  check("No page errors or console errors during the run", consoleErrors.length === 0, consoleErrors.slice(0, 8).join(" || "));
} catch (err) {
  check("Suite completed without crashing", false, err.stack ?? err);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ base: BASE, channel: CHANNEL, date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Report: test-results/report.json`);
if (failed.length) {
  console.log("Failures:");
  failed.forEach((f) => console.log(`  - [${f.journey}] ${f.name} ${f.detail}`));
  process.exitCode = 1;
}
