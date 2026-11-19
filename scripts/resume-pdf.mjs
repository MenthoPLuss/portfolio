/**
 * Prints the /resume page to public/asimangkan-boro-resume.pdf.
 *
 *   npm run build && npm run start -- -p 3100
 *   npm run resume:pdf                 (BASE_URL defaults to http://localhost:3100)
 *
 * Uses playwright-core with the locally installed Microsoft Edge (channel "msedge").
 * Set BROWSER_CHANNEL=chrome, or BROWSER_PATH=/path/to/chromium, to use another browser.
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = path.join(ROOT, "public", "asimangkan-boro-resume.pdf");

const browser = await chromium.launch(
  process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH, headless: true }
    : { channel: process.env.BROWSER_CHANNEL ?? "msedge", headless: true },
);
const page = await browser.newPage();
await page.goto(`${BASE}/resume`, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.pdf({ path: OUT, format: "A4", preferCSSPageSize: true });
await browser.close();
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
