// Smoke test headless: apre la build, raccoglie errori console e fa screenshot.
// Uso: node tools/smoke.mjs [url] [screenshot.png] [waitMs] ["js da eseguire"]
import puppeteer from "puppeteer-core";

const url = process.argv[2] || "http://localhost:4173/";
const shot = process.argv[3] || "/tmp/ifacgalaxy.png";
const waitMs = parseInt(process.argv[4] || "6000");
const exec = process.argv[5];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium-browser",
  headless: "new",
  args: ["--no-sandbox", "--use-angle=swiftshader", "--window-size=1280,800"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}`));
page.on("requestfailed", (r) => logs.push(`[REQFAIL] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, waitMs));
if (exec) {
  try {
    const res = await page.evaluate(exec);
    if (res !== undefined) console.log("EVAL:", JSON.stringify(res));
    await new Promise((r) => setTimeout(r, 2500));
  } catch (e) {
    logs.push(`[EVALERROR] ${e.message}`);
  }
}
await page.screenshot({ path: shot });
console.log(logs.length ? logs.join("\n") : "(nessun messaggio console)");
console.log("screenshot:", shot);
await browser.close();
