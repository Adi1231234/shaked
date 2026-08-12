import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812 });

page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

await page.goto('https://adi1231234.github.io/suhsh/#perftest', { waitUntil: 'networkidle0' });
console.log('Page loaded, waiting for perftest (20 taps over 4s + 15s observation)...');

// Wait for the perftest to complete (15s after page load + buffer)
await new Promise(r => setTimeout(r, 20000));

// Get final title
const title = await page.title();
console.log(`Final title: ${title}`);

// Also manually check effects state
const stats = await page.evaluate(() => {
  let totalBranches = 0, totalPts = 0, activeIntervals = 0, deadEffects = 0;
  for (const e of effects) {
    if (e.life <= 0) deadEffects++;
    if (e.branches) {
      totalBranches += e.branches.length;
      for (const b of e.branches) totalPts += b.pts.length;
      if (e._intervals) {
        activeIntervals += e._intervals.length;
      }
    }
  }
  return { effects: effects.length, totalBranches, totalPts, activeIntervals, deadEffects };
});
console.log('[MANUAL CHECK]', JSON.stringify(stats));

await browser.close();
