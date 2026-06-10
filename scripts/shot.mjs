// Dev-only helper: screenshot the running app, optionally scrolling/clicking first.
// Usage: node scripts/shot.mjs out.png [scrollDeltaTotal] [clickX,clickY] [waitMs]
import { chromium } from 'playwright';

const out = process.argv[2] ?? '/tmp/shot.png';
const scroll = Number(process.argv[3] ?? 0);
const click = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
const wait = Number(process.argv[5] ?? 2500);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(wait);
if (scroll) {
  // emit wheel events in steps so velocity-driven warp behaves realistically
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, scroll / steps);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1200);
}
if (click) {
  await page.mouse.click(click[0], click[1]);
  await page.waitForTimeout(2200);
}
await page.screenshot({ path: out });
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 10).join('\n'));
else console.log('no console errors');
await browser.close();
