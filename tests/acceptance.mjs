/**
 * Acceptance journeys for "The Living Editorial", run against a production server.
 *
 *   npm run build && npm run start -- -p 3100
 *   npm run test:acceptance            (BASE_URL defaults to http://localhost:3100)
 *
 * Uses playwright-core with the locally installed Microsoft Edge (channel "msedge").
 * Set BROWSER_CHANNEL=chrome to use Google Chrome instead.
 * Sound checks read Web Audio state. They are not listening tests.
 */
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL ?? "msedge";
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

const browser = await chromium.launch({ channel: CHANNEL, headless: true });

async function newPage(opts = {}, { trackErrors = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  await ctx.addInitScript(() => {
    // Count animation frames so idle loops can be detected.
    window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.__raf++;
      return raf(cb);
    };
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

const ready = (page) => page.waitForFunction(() => document.documentElement.classList.contains("motion") || document.documentElement.classList.contains("reduce"));
const audio = (page) => page.evaluate(() => (window.__abAudio ? window.__abAudio() : { state: "no-bridge" }));
const html = (page) => page.evaluate(() => document.documentElement.className);
const rafDuring = async (page, ms) => {
  const a = await page.evaluate(() => window.__raf);
  await sleep(ms);
  return (await page.evaluate(() => window.__raf)) - a;
};
const exhibit = (page, slug) => page.locator(`#p-${slug}`).locator("xpath=ancestor::article");

try {
  /* ------------------------------------------------------------------ 1 */
  journey("1. First impression");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    check("No loading screen", (await page.locator(".loader").count()) === 0);
    check("Name, headline, résumé and nav are present at first paint", (await page.locator(".hero-name").innerText()) === "Asimangkan Boro" && (await page.locator("#hero-title").innerText()).replace(/\s+/g, " ").includes("Making digital things feel human.") && (await page.locator('.hero-actions a[href="/resume"]').count()) === 1 && (await page.locator("#site-nav a").allInnerTexts()).join(",") === "Work,About,Skills,Experience,Contact");
    check("Headline has a single accessible name", (await page.locator("#hero-title").evaluate((h) => h.querySelector(".sr-only").textContent)) === "Making digital things feel human." && (await page.locator("#hero-title .lt").getAttribute("aria-hidden")) === "true");
    const ssr = await (await fetch(BASE)).text();
    check("Hero, work, skills, about and contact are server-rendered", ["Making digital", "Selected work", "JEC Maps", "M-PHISH", "Tender AI", "Plugora", "Skills", "Code is what I build with.", "Have something worth building?", `mailto:${CONTACT}`, 'href="/resume"'].every((s) => ssr.includes(s)));
    check("No WebGL canvas or three.js on the page", !ssr.includes("<canvas") && !/three/i.test(ssr.match(/<script[^>]+src="[^"]+"/g)?.join(" ") ?? ""));
    await ready(page);
    await sleep(1800);
    await page.screenshot({ path: `${OUT}/1-hero-desktop.png` });
    check("Silent by default: no AudioContext", (await audio(page)).state === "none");

    // Living Type: pointer changes glyphs without moving the layout
    const before = await page.locator("#hero-title").boundingBox();
    const g = page.locator(".lt-g").nth(3);
    const gb = await g.boundingBox();
    await page.mouse.move(gb.x + gb.width / 2 - 30, gb.y + gb.height / 2);
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2, { steps: 6 });
    await sleep(500);
    const styled = await page.evaluate(() => Array.from(document.querySelectorAll(".lt-g")).filter((x) => x.style.fontVariationSettings || x.style.transform).length);
    const mode = await page.locator(".lt").getAttribute("data-living");
    const after = await page.locator("#hero-title").boundingBox();
    check("Living Type responds to the pointer", styled > 0 && (mode === "axis" || mode === "lift"), `${styled} glyphs, mode ${mode}`);
    check("Pointer interaction causes no layout shift", Math.abs(before.height - after.height) < 0.5 && Math.abs(before.width - after.width) < 0.5);
    await page.screenshot({ path: `${OUT}/1-living-type.png` });
    await page.mouse.move(700, 880);
    await sleep(1200);
    const idle = await rafDuring(page, 1500);
    check("No animation loop while idle", idle <= 2, `${idle} frames requested in 1.5 s`);
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 2 */
  journey("2. Navigation");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await ready(page);
    for (const id of ["work", "about", "skills", "experience", "contact"]) {
      await page.click(`#site-nav a[href="#${id}"]`);
      await sleep(700);
      const info = await page.evaluate((id) => {
        const sec = document.getElementById(id).getBoundingClientRect().top;
        const a = document.querySelector(`#site-nav a[href="#${id}"]`);
        const bar = document.querySelector(".nav-bar");
        const ar = a.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        return { sec: Math.round(sec), current: a.getAttribute("aria-current"), barOn: getComputedStyle(bar).opacity === "1", barAligned: Math.abs(br.left - ar.left) < 2 && Math.abs(br.width - ar.width) < 2 };
      }, id);
      check(`Nav #${id}: lands below the header, marks the active link, indicator aligned`, info.sec >= 50 && info.sec <= 80 && info.current === "true" && info.barOn && info.barAligned, JSON.stringify(info));
    }
    await page.evaluate(() => document.getElementById("leadership").scrollIntoView());
    await sleep(600);
    check("Leadership and education light up Experience", (await page.locator('#site-nav a[aria-current="true"]').innerText()) === "Experience");
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(600);
    check("Indicator hides on the hero", (await page.locator(".nav-bar").evaluate((b) => getComputedStyle(b).opacity)) === "0");
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 3 */
  journey("3. Project exhibits");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await ready(page);

    // JEC Maps
    const maps = exhibit(page, "jec-maps");
    await maps.scrollIntoViewIfNeeded();
    await sleep(900);
    await maps.getByRole("button", { name: "Library" }).click();
    await sleep(1500);
    const m1 = await maps.evaluate((a) => ({
      pressed: a.querySelector('.maps-dests button[aria-pressed="true"]')?.textContent,
      dest: a.querySelector(".maps-info dd")?.textContent,
      route: !!a.querySelector(".maps-route"),
      dot: [Number(a.querySelector(".maps-traveller")?.getAttribute("cx")), Number(a.querySelector(".maps-traveller")?.getAttribute("cy"))],
      via: a.querySelectorAll(".maps-info dd")[1]?.textContent,
    }));
    check("JEC Maps: choosing a destination draws a computed route", m1.pressed === "Library" && m1.dest === "Library" && m1.route && /Junction/.test(m1.via), JSON.stringify(m1));
    check("JEC Maps: marker arrives at the destination", Math.abs(m1.dot[0] - 64) < 0.5 && Math.abs(m1.dot[1] - 14) < 0.5, m1.dot.join(","));
    check("JEC Maps: route animation stops when done", (await rafDuring(page, 1000)) <= 2);
    await page.screenshot({ path: `${OUT}/3-jec-maps.png` });
    await maps.locator('.maps-place:has-text("HOSTEL")').click();
    await sleep(300);
    check("JEC Maps: map buildings are selectable too", (await maps.locator(".maps-info dd").first().innerText()) === "Hostel");
    await maps.getByRole("button", { name: "Reset route" }).click();
    check("JEC Maps: reset clears the route", (await maps.locator(".maps-route").count()) === 0 && (await maps.locator(".maps-info dd").first().innerText()) === "Not selected");

    // M-PHISH
    const phish = exhibit(page, "m-phish");
    await phish.scrollIntoViewIfNeeded();
    await sleep(900);
    await phish.getByRole("button", { name: /Refund request/ }).click();
    await phish.getByRole("button", { name: "Inspect message" }).click();
    await sleep(1200);
    const p1 = await phish.evaluate((a) => ({ level: a.querySelector(".phish-level")?.textContent, signals: a.querySelectorAll(".phish-signals li").length, marks: a.querySelectorAll(".phish-mark").length, links: a.querySelectorAll(".phish-message a").length }));
    check("M-PHISH: risky message is explained with highlighted signals", p1.level === "High risk" && p1.signals >= 3 && p1.marks >= 2, JSON.stringify(p1));
    check("M-PHISH: sample links are never live links", p1.links === 0);
    await page.screenshot({ path: `${OUT}/3-m-phish.png` });
    await phish.getByRole("button", { name: /Event update/ }).click();
    check("M-PHISH: switching messages clears the old report", (await phish.locator(".phish-level").count()) === 0);
    await phish.getByRole("button", { name: "Inspect message" }).click();
    await sleep(600);
    check("M-PHISH: benign message reads as low risk with no signals", (await phish.locator(".phish-level").innerText()) === "Low risk" && (await phish.locator(".phish-signals li").count()) === 0);
    await phish.getByRole("button", { name: "Clear inspection" }).click();
    check("M-PHISH: clear resets the report", (await phish.locator(".phish-empty").count()) === 1);

    // Tender AI
    const tender = exhibit(page, "tender-ai");
    await tender.scrollIntoViewIfNeeded();
    await sleep(900);
    await tender.getByRole("button", { name: "CCTV upkeep" }).click();
    await tender.getByRole("button", { name: "Extract fields" }).click();
    await sleep(500);
    const midway = await tender.locator('.tender-doc li[data-current="true"]').count();
    await sleep(2400);
    const t1 = await tender.evaluate((a) => ({ filled: a.querySelectorAll('.tender-fields div[data-filled="true"]').length, sources: a.querySelectorAll('.tender-doc li[data-source="true"]').length, value: a.querySelectorAll(".tender-fields dd")[2]?.textContent }));
    check("Tender AI: extraction steps through fields and source lines", midway === 1 && t1.filled === 6 && t1.sources === 6 && t1.value === "₹7,20,000", JSON.stringify({ midway, ...t1 }));
    await page.screenshot({ path: `${OUT}/3-tender-ai.png` });
    await tender.getByRole("button", { name: "Compare all three" }).click();
    const t2 = await tender.evaluate((a) => Array.from(a.querySelectorAll("tbody tr")).map((r) => [r.querySelector("th").textContent, Array.from(r.querySelectorAll("em")).map((e) => e.textContent)]));
    check("Tender AI: comparison highlights the right tenders", t2.length === 3 && t2.find((r) => r[0].startsWith("Campus CCTV"))[1].includes("Closes first") && t2.find((r) => r[0].startsWith("Campus CCTV"))[1].includes("Lowest EMD") && t2.find((r) => r[0].startsWith("Hostel solar"))[1].includes("Highest value"), JSON.stringify(t2));
    await tender.getByRole("button", { name: "Lab computers" }).click();
    check("Tender AI: choosing a document returns to the document view", (await tender.locator(".tender-doc").count()) === 1);

    // Plugora
    const plug = exhibit(page, "plugora");
    await plug.scrollIntoViewIfNeeded();
    await sleep(900);
    await plug.getByRole("button", { name: /Park Road garage/ }).click();
    const taken = await plug.locator('.plug-slots [role="group"] button:disabled').allInnerTexts();
    check("Plugora: selecting a charger shows sample slots, taken ones disabled", taken.length === 1 && taken[0].startsWith("18:00"), taken.join(","));
    check("Plugora: request is disabled until a slot is chosen", await plug.getByRole("button", { name: "Pick a slot" }).isDisabled());
    await plug.locator(".plug-slots button", { hasText: "19:00" }).click();
    await plug.getByRole("button", { name: /Request 19:00/ }).click();
    const conf = await plug.locator(".plug-confirm").innerText();
    check("Plugora: simulated confirmation says nothing was booked", /nothing booked/i.test(conf) && conf.includes("Park Road garage") && conf.includes("19:00"), conf.replace(/\s+/g, " "));
    await page.screenshot({ path: `${OUT}/3-plugora.png` });
    await plug.getByRole("button", { name: "Start over" }).click();
    check("Plugora: start over resets", (await plug.locator(".plug-confirm").count()) === 0 && (await plug.locator('.plug-item[aria-pressed="true"]').count()) === 0);
    await plug.locator('.plug-pin:has-text("C")').click();
    check("Plugora: map pins are selectable", (await plug.locator('.plug-item[aria-pressed="true"]').innerText()).includes("Riverside"));

    // keyboard operation of a demo
    await maps.scrollIntoViewIfNeeded();
    await maps.getByRole("button", { name: "Canteen" }).focus();
    await page.keyboard.press("Enter");
    await sleep(1400);
    check("Demos are keyboard-operable", (await maps.locator(".maps-info dd").first().innerText()) === "Canteen");
    check("Demo state changes are announced politely", (await maps.locator('[aria-live="polite"]').innerText()).startsWith("Route to Canteen"));
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 4 */
  journey("4. Case studies, history and focus");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await ready(page);
    await page.evaluate(() => document.querySelector('[data-case-link="jec-maps"]').scrollIntoView({ block: "center" }));
    await sleep(1200);
    await page.evaluate(() => window.addEventListener("pointerdown", () => (window.__yAtPress = scrollY), { capture: true, once: true }));
    const link = page.locator('[data-case-link="jec-maps"]');
    await link.click();
    const y0 = await page.evaluate(() => window.__yAtPress);
    await page.waitForSelector('[role="dialog"]');
    await sleep(800);
    check("URL becomes /work/jec-maps", new URL(page.url()).pathname === "/work/jec-maps", page.url());
    check("Dialog is named by the case title", (await page.locator("#case-title").innerText()) === "JEC Maps" && (await page.locator('[role="dialog"]').getAttribute("aria-labelledby")) === "case-title");
    check("Document title follows the case", (await page.title()).startsWith("JEC Maps ·"), await page.title());
    check("Focus moves into the dialog", await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')));
    check("Case media is the live demo with the shared transition name", (await page.locator(".case-media .stage").evaluate((s) => s.style.viewTransitionName)) === "stage-jec-maps" && (await page.locator("article .stage-jec-maps").evaluate((s) => s.style.viewTransitionName)) === "");
    await page.locator(".case-media").getByRole("button", { name: "Labs" }).click();
    await sleep(300);
    check("Demo works inside the case study", (await page.locator(".case-media .maps-info dd").first().innerText()) === "Labs");
    let trapped = true;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) trapped = false;
    }
    check("Tab stays trapped inside the dialog", trapped);
    check("Page behind is inert", (await page.locator("#page").getAttribute("inert")) !== null);
    await page.screenshot({ path: `${OUT}/4-case-desktop.png` });
    await page.keyboard.press("Escape");
    await sleep(900);
    check("Escape closes the case", (await page.locator('[role="dialog"]').count()) === 0 && new URL(page.url()).pathname === "/");
    const y1 = await page.evaluate(() => scrollY);
    check("Scroll position restored exactly", Math.abs(y1 - y0) <= 1, `${y0} → ${y1}`);
    check("Focus returns to the case link", await page.evaluate(() => document.activeElement?.getAttribute("data-case-link") === "jec-maps"));

    await link.click();
    await page.waitForSelector('[role="dialog"]');
    await sleep(700);
    await page.goBack();
    await sleep(900);
    check("Browser Back closes the case", (await page.locator('[role="dialog"]').count()) === 0 && new URL(page.url()).pathname === "/");
    await page.goForward();
    await sleep(900);
    check("Forward reopens the case", (await page.locator("#case-title").count()) === 1 && new URL(page.url()).pathname === "/work/jec-maps");
    await page.click(".case-next");
    await sleep(500);
    check("Next case swaps in place", new URL(page.url()).pathname === "/work/m-phish" && (await page.locator("#case-title").innerText()) === "M-PHISH");
    await page.click(".case-close");
    await sleep(900);
    check("Close returns to the gallery", (await page.locator('[role="dialog"]').count()) === 0 && new URL(page.url()).pathname === "/");
    await ctx.close();

    const raw = await (await fetch(`${BASE}/work/jec-maps`)).text();
    check("Direct case URL is server-rendered with the dialog and metadata", raw.includes('role="dialog"') && raw.includes("<title>JEC Maps · Asimangkan Boro</title>") && raw.includes('<meta name="description" content="JEC Maps:'));
    const d = await newPage();
    await d.page.goto(`${BASE}/work/jec-maps`);
    await d.page.waitForSelector("#case-title");
    await d.page.reload();
    await d.page.waitForSelector("#case-title");
    check("Refresh keeps the case open", new URL(d.page.url()).pathname === "/work/jec-maps");
    await d.page.waitForFunction(() => window.__abCaseAdopted === true, null, { timeout: 5000 });
    await d.page.goBack();
    await sleep(900);
    const afterBack = await d.page.evaluate(() => ({ path: location.pathname, hash: location.hash, top: Math.round(document.getElementById("work").getBoundingClientRect().top), open: !!document.querySelector('[role="dialog"]') }));
    check("Back from a direct case lands on #work", !afterBack.open && afterBack.path === "/" && afterBack.hash === "#work" && afterBack.top >= 0 && afterBack.top <= 80, JSON.stringify(afterBack));
    await d.page.goto(`${BASE}/work/plugora`);
    await d.page.waitForSelector("#case-title");
    await d.page.waitForFunction(() => window.__abCaseAdopted === true, null, { timeout: 5000 });
    await d.page.click(".case-close");
    await sleep(900);
    const afterClose = await d.page.evaluate(() => ({ path: location.pathname, hash: location.hash, focus: document.activeElement?.id }));
    check("Closing a direct case goes to #work and focuses it", afterClose.path === "/" && afterClose.hash === "#work" && afterClose.focus === "work-title", JSON.stringify(afterClose));
    await d.ctx.close();
    check("Unknown case URL returns 404", (await fetch(`${BASE}/work/not-a-case`)).status === 404);
  }

  /* ------------------------------------------------------------------ 5 */
  journey("5. Responsive layouts");
  for (const vp of [
    { width: 360, height: 740, name: "360", touch: true },
    { width: 390, height: 844, name: "390", touch: true },
    { width: 768, height: 1024, name: "768", touch: true },
    { width: 1440, height: 900, name: "1440", touch: false },
    { width: 1920, height: 1080, name: "1920", touch: false },
  ]) {
    const { ctx, page } = await newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.touch && vp.width < 700, hasTouch: vp.touch, deviceScaleFactor: vp.width < 700 ? 2 : 1 });
    await page.goto(BASE);
    await ready(page);
    await sleep(1600);
    await page.screenshot({ path: `${OUT}/5-hero-${vp.name}.png` });
    const overflow = [];
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += vp.height * 0.8) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await sleep(40);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 0) overflow.push(`${Math.round(y)}:${o}`);
    }
    check(`${vp.name}px: no horizontal overflow`, overflow.length === 0, overflow.join(" "));
    const exhibitsFit = await page.evaluate(() => Array.from(document.querySelectorAll(".exhibit .stage")).every((s) => s.getBoundingClientRect().right <= document.documentElement.clientWidth + 0.5));
    check(`${vp.name}px: demo stages fit the viewport`, exhibitsFit);
    if (vp.width <= 768) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.tap(".menu-btn");
      await sleep(200);
      check(`${vp.name}px: menu opens with all sections`, (await page.locator("#site-nav").isVisible()) && (await page.locator("#site-nav a").allInnerTexts()).join(",") === "Work,About,Skills,Experience,Contact");
      await page.screenshot({ path: `${OUT}/5-menu-${vp.name}.png` });
      await page.tap('#site-nav a[href="#skills"]');
      await sleep(500);
      check(`${vp.name}px: menu link navigates and closes`, !(await page.locator("#site-nav").isVisible()) && (await page.evaluate(() => location.hash)) === "#skills");
      const small = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#page a[href], #page button, #page summary"))
          .filter((e) => e.offsetParent !== null && !e.closest(".capsule") && !e.classList.contains("term") && !e.closest(".credits"))
          .map((e) => [e.textContent.trim().slice(0, 24), Math.round(e.getBoundingClientRect().height)])
          .filter(([, h]) => h > 0 && h < 44),
      );
      check(`${vp.name}px: touch targets ≥ 44 px (inline prose terms excepted)`, small.length === 0, JSON.stringify(small));
      const order = await page.evaluate(() => Array.from(document.querySelectorAll(".exhibit")).map((a) => {
        const t = a.querySelector(".exhibit-text").getBoundingClientRect();
        const f = a.querySelector(".exhibit-figure").getBoundingClientRect();
        return f.top > t.top;
      }));
      check(`${vp.name}px: each exhibit stacks text then demo`, order.every(Boolean));
      const maps = exhibit(page, "jec-maps");
      await maps.scrollIntoViewIfNeeded();
      await maps.getByRole("button", { name: "Library" }).tap();
      await sleep(1400);
      check(`${vp.name}px: demos work by touch`, (await maps.locator(".maps-info dd").first().innerText()) === "Library");
      await page.screenshot({ path: `${OUT}/5-demo-${vp.name}.png` });
      const view = page.locator('[data-case-link="tender-ai"]');
      await view.scrollIntoViewIfNeeded();
      await view.tap();
      await page.waitForSelector(".case-panel");
      await sleep(900);
      const sheet = await page.locator(".case-panel").boundingBox();
      if (vp.width < 700) check(`${vp.name}px: case opens as a full-screen reading sheet`, Math.round(sheet.x) === 0 && Math.round(sheet.width) === vp.width && Math.round(sheet.height) === vp.height, JSON.stringify(sheet));
      await page.screenshot({ path: `${OUT}/5-case-${vp.name}.png` });
      await page.tap(".case-close");
      await sleep(700);
      await page.evaluate(() => document.getElementById("contact").scrollIntoView());
      await sleep(900);
      const email = await page.locator(".contact-email").boundingBox();
      check(`${vp.name}px: email fits the viewport`, email.x >= 0 && email.x + email.width <= vp.width + 0.5);
      check(`${vp.name}px: no custom cursor on touch`, !(await html(page)).includes("has-cursor"));
    }
    for (const id of ["work", "about", "skills", "leadership", "contact"]) {
      await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
      await sleep(900);
      await page.screenshot({ path: `${OUT}/5-${id}-${vp.name}.png` });
    }
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 6 */
  journey("6. Keyboard, reduced motion, no JavaScript");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await ready(page);
    await page.keyboard.press("Tab");
    check("First Tab reaches the skip link", (await page.evaluate(() => document.activeElement?.className)) === "skip-link");
    await page.keyboard.press("Enter");
    check("Skip link moves focus to main", (await page.evaluate(() => document.activeElement?.id)) === "main");
    let reachedCase = false;
    for (let i = 0; i < 40 && !reachedCase; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => ({ slug: document.activeElement?.getAttribute("data-case-link"), outline: getComputedStyle(document.activeElement).outlineStyle }));
      if (info.slug) {
        reachedCase = true;
        check("Focus ring is visible on links", info.outline !== "none", info.outline);
        await page.keyboard.press("Enter");
        await page.waitForSelector('[role="dialog"]');
        await sleep(700);
        await page.keyboard.press("Escape");
        await sleep(900);
        check("Keyboard: open and close a case, focus restored", await page.evaluate(() => !!document.activeElement?.getAttribute("data-case-link")));
      }
    }
    check("Tab order reaches a case link", reachedCase);
    await page.locator(".term").first().focus();
    check("Keyboard focus reveals the evidence capsule", await page.evaluate(() => {
      const t = document.querySelector(".term");
      return t.getAttribute("aria-expanded") === "true" && !document.getElementById(t.getAttribute("aria-controls")).hidden;
    }));
    await page.keyboard.press("Escape");
    check("Escape dismisses the capsule", (await page.locator('.term[aria-expanded="true"]').count()) === 0);
    await page.locator(".skill-evidence summary").first().focus();
    await page.keyboard.press("Enter");
    check("Skill evidence expands from the keyboard", (await page.locator(".skill-evidence").first().getAttribute("open")) !== null);
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage({ reducedMotion: "reduce" });
    await page.goto(BASE);
    await ready(page);
    await sleep(300);
    const cls = await html(page);
    check("System reduced motion honoured", cls.includes("reduce") && !cls.includes("has-cursor"), cls);
    check("Reduced: headline complete immediately", await page.evaluate(() => Array.from(document.querySelectorAll(".lt-inner")).every((e) => getComputedStyle(e).transform === "none")));
    await page.evaluate(() => document.getElementById("work").scrollIntoView());
    await sleep(200);
    check("Reduced: exhibits and text fully visible", await page.evaluate(() => Array.from(document.querySelectorAll(".stage")).every((s) => ["none", "inset(0px)"].includes(getComputedStyle(s).clipPath)) && Array.from(document.querySelectorAll("[data-reveal=fade]")).every((e) => getComputedStyle(e).opacity === "1")));
    const maps = exhibit(page, "jec-maps");
    await maps.getByRole("button", { name: "Library" }).click();
    await sleep(150);
    const dot = await maps.locator(".maps-traveller").evaluate((c) => [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]);
    check("Reduced: demo shows the result without animating", Math.abs(dot[0] - 64) < 0.5 && Math.abs(dot[1] - 14) < 0.5);
    await page.screenshot({ path: `${OUT}/6-reduced.png` });
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await ready(page);
    await page.locator(".site-footer .motion-toggle").scrollIntoViewIfNeeded();
    await page.click(".site-footer .motion-toggle");
    check("Reduce motion control applies at once", (await html(page)).includes("reduce"));
    await page.reload();
    await ready(page);
    check("Reduce motion setting persists", (await html(page)).includes("reduce") && (await page.locator(".site-footer .motion-toggle").getAttribute("aria-pressed")) === "true");
    await page.click(".site-footer .motion-toggle");
    check("Motion can be turned back on", (await html(page)).includes("motion"));
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage({ javaScriptEnabled: false }, { trackErrors: false });
    await page.goto(BASE);
    const vis = await page.evaluate(() => ({
      h1: document.querySelector("#hero-title .lt").getBoundingClientRect().height > 100,
      sections: ["work", "about", "skills", "experience", "leadership", "education", "contact"].every((id) => document.getElementById(id)),
      fades: Array.from(document.querySelectorAll("[data-reveal]")).every((e) => getComputedStyle(e).opacity === "1"),
      stages: document.querySelectorAll(".stage .lab").length,
    }));
    check("Without JavaScript: headline, sections and demo initial states render", vis.h1 && vis.sections && vis.fades && vis.stages === 4, JSON.stringify(vis));
    await page.screenshot({ path: `${OUT}/6-no-js.png` });
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 7 */
  journey("7. Sound (state checks, not a listening test)");
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await ready(page);
    await page.mouse.move(100, 400);
    await page.mouse.move(1200, 500, { steps: 10 });
    await page.mouse.wheel(0, 900);
    await sleep(300);
    check("Off by default: moving and scrolling create no audio", (await audio(page)).state === "none");
    await page.evaluate(() => scrollTo(0, 0));
    await page.click(".header-tools .sound-toggle");
    await page.waitForFunction(() => window.__abAudio?.().state === "running", null, { timeout: 4000 }).catch(() => {});
    await sleep(300);
    check("Sound turns on after an explicit click", (await audio(page)).state === "running" && (await page.locator(".header-tools .sound-toggle").innerText()).toLowerCase().includes("sound on"));
    await sleep(800);
    await page.mouse.move(200, 600);
    await page.mouse.move(1300, 300, { steps: 12 });
    await page.mouse.wheel(0, 1500);
    await sleep(200);
    check("No sound on pointer movement or scrolling", (await audio(page)).voices === 0);
    await page.evaluate(() => scrollTo(0, 0));
    await page.click('#site-nav a[href="#about"]');
    await sleep(40);
    check("Navigation plays a short cue", (await audio(page)).voices > 0);
    await sleep(600);
    const v = [];
    for (let i = 0; i < 12; i++) {
      await page.click('#site-nav a[href="#skills"]');
      v.push((await audio(page)).voices);
    }
    check("Rapid clicks never pile up voices", Math.max(...v) <= 4, `max ${Math.max(...v)}`);
    await page.click(".header-tools .sound-toggle");
    await sleep(400);
    check("Sound off suspends audio", (await audio(page)).state === "suspended" && (await page.evaluate(() => localStorage.getItem("ab.sound"))) === "off");
    await page.click(".header-tools .sound-toggle");
    await sleep(500);
    await page.reload();
    await ready(page);
    check("Remembered sound waits for a gesture", (await page.locator(".header-tools .sound-toggle").innerText()).toLowerCase().includes("resume") && (await audio(page)).state === "none");
    await page.mouse.click(700, 500);
    await sleep(1200);
    check("First gesture resumes remembered sound", (await audio(page)).state === "running");
    await ctx.close();
  }

  /* ------------------------------------------------------------------ 8 */
  journey("8. Content, links, résumé, clipboard");
  {
    const home = await (await fetch(BASE)).text();
    const text = home.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
    for (const s of ["JEC Maps", "M-PHISH", "Tender AI", "Plugora"]) check(`Project present: ${s}`, text.includes(s));
    check("Exactly four project exhibits", (home.match(/<article class="exhibit /g) ?? []).length === 4);
    check("Internship: Frint.in, Jul–Aug 2026", text.includes("Software Development Intern") && text.includes("Frint.in") && text.includes("Jul–Aug 2026"));
    check("Both schools", text.includes("Jorhat Engineering College") && text.includes("Sai Vikash Vidya Niketan") && text.includes("2021–2023"));
    check("Leadership: GDG on Campus JEC, JEC Students’ Union, GLUG-JEC", ["GDG on Campus JEC", "General Sports Secretary", "JEC Students’ Union", "2026–2027", "IIT Guwahati Spirit", "Club Advisor", "GLUG-JEC"].every((s) => text.includes(s)));
    check("Undated roles are labelled, not given invented dates", (home.match(/class="index-date mono">Dates not listed</g) ?? []).length === 2);
    check("Contact address and mailto", text.includes(CONTACT) && home.includes(`href="mailto:${CONTACT}"`));
    check("Demos are labelled as demonstrations or simulations", ["Demonstration geometry", "This is not the M-PHISH engine", "not output from Tender AI", "Nothing is reserved"].every((s) => text.includes(s)));
    check("No invented metrics or testimonials", !/testimonial|accuracy|users served|downloads|award|revenue|customers/i.test(text));
    const hrefs = new Set();
    for (const p of ["/", ...SLUGS.map((s) => `/work/${s}`)]) {
      const h = await (await fetch(BASE + p)).text();
      for (const m of h.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"/g)) hrefs.add(m[1].replace(/&amp;/g, "&"));
    }
    for (const href of hrefs) {
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
    check("Printable résumé serves", r.status === 200 && rt.includes("Asimangkan Boro") && rt.includes(CONTACT) && rt.includes("Print or save as PDF"));
    for (const p of ["/icon.svg", "/opengraph-image"]) check(`Asset serves: ${p}`, (await fetch(BASE + p)).status === 200);
    check("Home title and description", /<title>Asimangkan Boro · Software developer from Assam<\/title>/.test(home) && /<meta name="description"/.test(home));

    const ok = await newPage();
    await ok.ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await ok.page.goto(`${BASE}/#contact`);
    await ready(ok.page);
    await ok.page.click(".copy-row button");
    await sleep(300);
    const status = await ok.page.locator(".copy-status").innerText();
    const clip = await ok.page.evaluate(() => navigator.clipboard.readText());
    check("Copy succeeds with visible, announced feedback", status.includes("Email copied") && clip === CONTACT && (await ok.page.locator(".copy-status").getAttribute("aria-live")) === "polite", status);
    await ok.ctx.close();
    const bad = await newPage();
    await bad.ctx.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } });
      document.execCommand = () => false;
    });
    await bad.page.goto(`${BASE}/#contact`);
    await ready(bad.page);
    await bad.page.click(".copy-row button");
    await sleep(300);
    const fail = await bad.page.locator(".copy-status").innerText();
    check("Copy failure shows a visible fallback", fail.includes("Couldn’t copy") && fail.includes(CONTACT), fail);
    await bad.ctx.close();
  }

  journey("9. Console");
  check("No page errors, hydration errors or console errors", consoleErrors.length === 0, consoleErrors.slice(0, 8).join(" || "));
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
