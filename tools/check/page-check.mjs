// Opens one page in a real browser and reports everything that went wrong on it.

/**
 * Only our own files can fail the build. Google Fonts and the CDN the 3D
 * viewers pull three.js from are outside our control, and letting a hiccup
 * there turn the build red would make the check untrustworthy.
 */
const isOurs = (url, origin) => url.startsWith(origin);

export async function checkPage(browser, origin, { path, selector, min = 1 }) {
  const page = await browser.newPage();
  const problems = [];
  const url = `${origin}/${path}`;

  page.on('pageerror', (err) => problems.push(`uncaught: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // a console error about an external resource is that resource's problem
    if (!isOurs(msg.location()?.url ?? origin, origin)) return;
    problems.push(`console: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    if (isOurs(req.url(), origin)) problems.push(`request failed: ${req.url()}`);
  });
  page.on('response', (res) => {
    if (isOurs(res.url(), origin) && res.status() >= 400) {
      problems.push(`${res.status()} ${res.url().replace(origin, '')}`);
    }
  });

  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    if (!response?.ok()) problems.push(`page returned ${response?.status()}`);
    await page.waitForSelector(selector, { timeout: 20000, state: 'attached' });
    const found = await page.locator(selector).count();
    if (found < min) problems.push(`expected >=${min} "${selector}", found ${found}`);
  } catch (err) {
    problems.push(err.message.split('\n')[0]);
  }

  const extra = path === '' ? await checkHub(page, origin) : [];
  await page.close();
  return { path: path || '(hub)', problems: [...problems, ...extra] };
}

/** The hub carries the previews and every link into the rest of the site. */
async function checkHub(page, origin) {
  return page.evaluate(async (base) => {
    const found = [];
    for (const card of document.querySelectorAll('.card')) {
      const title = card.querySelector('.card__title')?.textContent ?? '?';
      if (!card.href.startsWith(base)) continue; // external download link
      const status = await fetch(card.href).then((r) => r.status).catch(() => 'unreachable');
      if (status !== 200) found.push(`card "${title}" links to ${status}`);
      const img = card.querySelector('img');
      const preview = img ? await fetch(img.src).then((r) => r.status).catch(() => 0) : 404;
      if (preview !== 200) found.push(`card "${title}" has no preview image`);
    }
    return found;
  }, origin);
}
