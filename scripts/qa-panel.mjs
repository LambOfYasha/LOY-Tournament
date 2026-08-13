import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await desktop.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/desktop.png", fullPage: true });

await page.getByLabel("Increase player 1 score").click();
await page.getByLabel("Increase player 1 score").click();
await page.getByRole("button", { name: "Swap Sides" }).click();
await page.getByRole("button", { name: "Push Match Info" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/after-actions.png", fullPage: false });

const scoreText = await page.locator(".score-value").allTextContents();
const preview = await page.locator(".preview-panel pre").innerText();

await desktop.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
const merr = [];
mpage.on("console", (m) => { if (m.type() === "error") merr.push(m.text()); });
await mpage.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await mpage.waitForTimeout(400);
const overflow = await mpage.evaluate(() => {
  const doc = document.documentElement;
  return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflow: doc.scrollWidth - doc.clientWidth };
});
await mpage.screenshot({ path: "/workspace/screenshots/mobile.png", fullPage: true });
await mobile.close();
await browser.close();

console.log(JSON.stringify({ errors, merr, scoreText, previewStart: preview.slice(0, 220), overflow }, null, 2));
