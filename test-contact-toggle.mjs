import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

const vite = spawn('npm.cmd', ['run', 'preview', '--', '--port', '4173'], {
  cwd: 'C:\\Users\\funny\\.gemini\\antigravity\\scratch\\rslogix-plc-simulator',
  stdio: 'pipe',
  shell: true
});

await new Promise((resolve) => setTimeout(resolve, 2000));

try {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem('hasSeenPlcTutorial', 'true'));
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

  await page.waitForSelector('select[aria-label="Load sample program"]');
  await page.select('select[aria-label="Load sample program"]', 'basic-direct');

  // Stop PLC if running
  const stopBtn = await page.waitForSelector('button[title="Stop PLC execution"]');
  if (stopBtn) await stopBtn.click();
  await new Promise(r => setTimeout(r, 500));

  await page.waitForSelector('.instruction-card', { timeout: 10000 });
  const contactCard = await page.$('.instruction-card');

  // Check initial text
  let text = await page.evaluate(el => el.innerText, contactCard);
  console.log('Initial card text:', text.replace(/\n/g, ' '));
  const initialIsXIC = text.includes('-] [-');
  console.log('Is initial XIC:', initialIsXIC);

  // Single click on the symbol inside the card
  const symbolEl = await contactCard.$('.font-mono.tracking-widest');
  if (!symbolEl) throw new Error('No symbol found');
  await symbolEl.click();
  await new Promise(r => setTimeout(r, 200));

  // Verify text did NOT change (single click must NOT flip XIC <-> XIO)
  text = await page.evaluate(el => el.innerText, contactCard);
  console.log('After single click on symbol text:', text.replace(/\n/g, ' '));
  if (initialIsXIC && !text.includes('-] [-')) {
    throw new Error('FAILED: Single click flipped XIC to XIO!');
  }
  console.log('SUCCESS: Single click did not toggle XIC/XIO!');

  // Verify segmented selector is visible
  const segButtons = await contactCard.$$('button[title*="Normally"]');
  console.log('Segmented buttons found when selected:', segButtons.length);
  if (segButtons.length !== 2) {
    throw new Error('FAILED: Segmented toggle buttons [XIC | XIO] not displayed when selected');
  }

  // Click the Normally Closed (XIO) button
  const xioBtn = await contactCard.$('button[title="Normally Closed (XIO)"]');
  await xioBtn.click();
  await new Promise(r => setTimeout(r, 200));
  text = await page.evaluate(el => el.innerText, contactCard);
  console.log('After clicking XIO segmented button:', text.replace(/\n/g, ' '));
  if (!text.includes('-[/]-')) {
    throw new Error('FAILED: Segmented XIO button did not change type to XIO');
  }
  console.log('SUCCESS: Segmented toggle button switched contact to XIO!');

  // Test double-click toggle on symbol
  await symbolEl.click({ clickCount: 2 });
  await new Promise(r => setTimeout(r, 200));
  text = await page.evaluate(el => el.innerText, contactCard);
  console.log('After double-click on symbol:', text.replace(/\n/g, ' '));
  if (!text.includes('-] [-')) {
    throw new Error('FAILED: Double-click did not toggle back to XIC');
  }
  console.log('SUCCESS: Double-click toggled back to XIC!');

  await browser.close();
  console.log('ALL TESTS PASSED!');
} finally {
  vite.kill();
}
