const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await puppeteer.launch({headless: true, pipe: true, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.evaluateOnNewDocument(()=>localStorage.setItem('hasSeenPlcTutorial','true'));
    await page.setViewport({width:1440,height:1000});
    await page.goto(process.env.SIMULATOR_URL || 'http://127.0.0.1:5173',{waitUntil:'networkidle0'});
    await page.waitForSelector('#tour-add-rung');
    assert.equal(await page.$eval('#tour-add-rung',e=>e.disabled),false);
    await page.select('select[aria-label="Load sample program"]','basic-direct');
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
    await page.waitForFunction(()=>!document.querySelector('.run-hint'));
    await new Promise(resolve=>setTimeout(resolve,200));
    await page.screenshot({path:'artifacts/desktop-dark.png',fullPage:true});
    await page.click('button[title="Toggle Dark/Light Mode"]');
    await new Promise(resolve=>setTimeout(resolve,200));
    await page.screenshot({path:'artifacts/desktop-light.png',fullPage:true});
    for (const width of [320,390,768]) {
      await page.setViewport({width,height:844});
      await page.screenshot({path:`artifacts/mobile-${width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`viewport overflow at ${width}`);
      assert.ok(await page.$eval('#tour-add-rung',e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth&&r.left>=0;}),'Add Rung stays accessible');
    }
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
    await page.reload({waitUntil:'networkidle0'});
    await page.click('.mobile-view-switch button:nth-child(2)');
    await page.waitForSelector('#tour-trainer', {visible:true});
    await page.click('button[aria-label="Switch 1"]');
    assert.equal(await page.$eval('button[aria-label="Switch 1"]',e=>e.getAttribute('aria-pressed')),'true');
    assert.ok(await page.$eval('.bench-switch button',e=>e.getBoundingClientRect().height>=44),'touch controls are at least 44px tall');
    await page.screenshot({path:'artifacts/mobile-bench.png',fullPage:true});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    assert.equal(await page.$eval('.ladder-rung',e=>getComputedStyle(e).animationName),'none');
    await page.evaluate(()=>{localStorage.setItem('plcRungs','[{"items":null}]');localStorage.setItem('plcSymbols','null');});
    await page.reload({waitUntil:'networkidle0'});
    await page.waitForSelector('#tour-add-rung');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('.ladder-rung').length),1,'malformed autosave recovers to a blank rung');
    assert.deepEqual(errors,[]); console.log('Browser checks passed: examples, run/stop, reset, monitor Escape, 320–1440px layouts, touch targets, reduced motion, corrupt autosave recovery, no runtime errors.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
