// Gera public/og-default.png (imagem padrão de compartilhamento) com as fontes do site.
import { chromium } from "@playwright/test";
import path from "node:path";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto("file://" + path.resolve("scripts/og-image.html"));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og-default.png" });
await browser.close();
console.log("public/og-default.png gerado");
