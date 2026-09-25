const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await puppeteer.launch({headless: true});
  try {
    const page = await browser.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.evaluateOnNewDocument(()=>localStorage.setItem('hasSeenPlcTutorial','true'));
    await page.setViewport({width:1440,height:1000});
    await page.goto(process.env.SIMULATOR_URL || 'http://127.0.0.1:5173',{waitUntil:'networkidle0'});
    await page.waitForSelector('#tour-add-rung');
    assert.equal(await page.$eval('#tour-add-rung',e=>e.disabled),false);
    await page.select('select[aria-label="Load example program"]',await page.$eval('select[aria-label="Load example program"] option:nth-child(2)',e=>e.value));
    await page.waitForFunction(()=>document.querySelector('#tour-add-rung').disabled);
    await page.click('button[title="Stop PLC execution"]');
    await page.waitForFunction(()=>!document.querySelector('#tour-add-rung').disabled);
    await page.click('button[title="Reset all lamps, coils, and timers to 0"]');
    await page.click('button[aria-label="Switch 1"]');
    assert.ok(await page.$('[aria-label="Amber lamp O:0/0: off"]'), 'stopped input changes must not execute logic');
    await page.click('button[aria-controls="bit-monitor"]');
    await page.waitForSelector('#bit-monitor');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#bit-monitor',{hidden:true});
    await page.click('button[title="Run PLC program"]');
    await page.waitForFunction(()=>document.querySelector('#tour-add-rung').disabled);
    await page.waitForSelector('[aria-label="Amber lamp O:0/0: on"]');
    const stop = await page.$('text/PROGRAM IS RUNNING'); assert.ok(stop); await stop.click();
    await page.waitForFunction(()=>!document.querySelector('#tour-add-rung').disabled);
    fs.mkdirSync('artifacts',{recursive:true});
    await page.screenshot({path:'artifacts/desktop-dark.png',fullPage:true});
    await page.click('button[title="Toggle Dark/Light Mode"]');
    await page.screenshot({path:'artifacts/desktop-light.png',fullPage:true});
    for (const width of [390,768]) {
      await page.setViewport({width,height:844});
      await page.screenshot({path:`artifacts/mobile-${width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`viewport overflow at ${width}`);
      assert.ok(await page.$eval('#tour-add-rung',e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth&&r.left>=0;}),'Add Rung stays accessible');
    }
    assert.deepEqual(errors,[]); console.log('Browser checks passed: examples, run/stop, reset, monitor Escape, responsive overflow, no runtime errors.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
