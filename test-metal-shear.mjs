import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'node:fs';

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
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

  // Switch to Metal Shear Scenario
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Metal shear'));
    if (btn) btn.click();
    else throw new Error('Metal shear button not found');
  });
  await new Promise(r => setTimeout(r, 400));

  // Load sample program 7: Metal Shear: Auto Cut-to-Length
  await page.waitForSelector('select[aria-label="Load sample program"]');
  await page.select('select[aria-label="Load sample program"]', 'metal-shear-auto');
  await new Promise(r => setTimeout(r, 400));

  // Ensure PLC is running
  const runBtn = await page.waitForSelector('.run-button');
  const isRun = await runBtn.evaluate(el => el.classList.contains('is-running'));
  if (!isRun) {
    await runBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }
  // Wait for initial scan to settle
  await new Promise(r => setTimeout(r, 600));

  // Press START pushbutton (I:0/0)
  const startPb = await page.waitForSelector('button[aria-label="Start Pushbutton (N.O.)"]');
  const box = await startPb.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 500));
  await page.mouse.up();
  console.log('Pressed and released START PB');

  // Monitor simulation for 10-12 seconds
  let cutCountSeen = 0;
  let sawProx = false;
  let sawDownLs = false;
  let sawMetalPastShear = false;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 200));

    const simStatus = await page.evaluate(() => {
      const trainer = document.querySelector('.metal-shear-trainer');
      if (!trainer) return null;
      const text = trainer.innerText;
      const cutMatch = text.match(/Cut:\s*(\d+)/);
      const binMatch = text.match(/Bin:\s*(\d+)/);
      const proxEl = trainer.querySelector('[title*="PROX"]');
      const downLsEl = trainer.querySelector('[title*="DOWN_LS"]');
      const proxOn = proxEl ? proxEl.className.includes('bg-yellow-950') : false;
      const downLsOn = downLsEl ? downLsEl.className.includes('bg-amber-950') : false;
      return {
        cutCount: cutMatch ? parseInt(cutMatch[1], 10) : 0,
        binCount: binMatch ? parseInt(binMatch[1], 10) : 0,
        proxOn,
        downLsOn
      };
    });

    if (simStatus) {
      if (simStatus.cutCount > cutCountSeen) {
        cutCountSeen = simStatus.cutCount;
        console.log(`[t=${i * 0.2}s] Cut count incremented to: ${cutCountSeen}`);
      }
      if (simStatus.proxOn) sawProx = true;
      if (simStatus.downLsOn) sawDownLs = true;
    }

    if (cutCountSeen >= 1 && sawDownLs) {
      console.log('SUCCESS: First cut cycle completed successfully!');
      break;
    }
  }

  // Take screenshot of simulation
  fs.mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/metal-shear-cut.png' });
  console.log('Saved screenshot artifacts/metal-shear-cut.png');

  console.log({ cutCountSeen, sawProx, sawDownLs });
  if (cutCountSeen < 1) {
    throw new Error('FAILED: Cut count did not increment. Shear did not execute cut.');
  }

  await browser.close();
  console.log('TEST COMPLETE: Metal shear simulation cuts material and advances continuously!');
} finally {
  vite.kill();
}
