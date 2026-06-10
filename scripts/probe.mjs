import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/fable5-museum.png' });
let t = (await page.evaluate(() => window.__tiles.filter((t) => t.inFront && t.facing)))[0];
console.log('clicking:', t?.id);
if (t) {
  await page.mouse.move(t.x, t.y);
  await page.waitForTimeout(800);
  t = await page.evaluate((id) => window.__tiles.find((x) => x.id === id), t.id);
  await page.mouse.click(t.x, t.y);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/tmp/fable5-museum-modal.png' });
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
