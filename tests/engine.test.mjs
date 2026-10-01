import test from 'node:test';
import assert from 'node:assert/strict';
import { PLCEngine } from '../src/engine/plcEngine.js';
import { createInitialDataModel } from '../src/types/plcTypes.js';
import { SAMPLE_PROGRAMS } from '../src/data/samplePrograms.js';
import { parseProgramFile } from '../src/engine/programFile.js';
import { validateLadderLogic } from '../src/engine/plcValidator.js';
const engine = () => new PLCEngine(createInitialDataModel());
const rung = (...items) => ({id: 'r', items});
const ins = (type, operand, params) => ({id: type + operand, type, operand, params});
test('later rungs see OTE writes in the same scan', () => {
  const e = engine(); e.setBit('I:0/0', true);
  e.executeScanCycle([rung(ins('XIC','I:0/0'),ins('OTE','B3:0/0')),rung(ins('XIC','B3:0/0'),ins('OTE','O:0/0'))]);
  assert.equal(e.getBit('O:0/0'),true);
});
test('last coil write wins including mixed latch and OTE', () => {
  const e = engine();
  e.executeScanCycle([rung(ins('OTL','O:0/0')),rung(ins('XIC','I:0/0'),ins('OTE','O:0/0'))]);
  assert.equal(e.getBit('O:0/0'),false);
  e.executeScanCycle([rung(ins('XIC','I:0/0'),ins('OTE','O:0/0')),rung(ins('OTL','O:0/0'))]);
  assert.equal(e.getBit('O:0/0'),true);
});
test('latches retain and unlatch; removed ordinary outputs clear', () => {
  const e = engine(); e.executeScanCycle([rung(ins('OTL','O:0/0'),ins('OTE','O:0/1'))]);
  e.executeScanCycle([]); assert.equal(e.getBit('O:0/0'),true); assert.equal(e.getBit('O:0/1'),false);
  e.executeScanCycle([rung(ins('OTU','O:0/0'))]); assert.equal(e.getBit('O:0/0'),false);
});
test('coils cannot overwrite inputs and malformed timers cannot reset timer zero', () => {
  const e = engine(); e.executeScanCycle([rung(ins('OTE','I:0/0'))]); assert.equal(e.getBit('I:0/0'),false);
  e.data.T4[0].ACC = 0.5; e.executeScanCycle([rung(ins('RES','BAD'))]); assert.equal(e.data.T4[0].ACC,0.5);
});
test('timer completes and resets with loss of power', () => {
  const e = engine(); e.setBit('I:0/0',true); e.lastScanTime = performance.now()-1100;
  const program = [rung(ins('XIC','I:0/0'),ins('TON','T4:0',{pre:1}))];
  e.executeScanCycle(program); assert.equal(e.data.T4[0].DN,true); assert.equal(e.data.T4[0].ACC,1);
  e.setBit('I:0/0',false); e.executeScanCycle(program); assert.equal(e.data.T4[0].ACC,0); assert.equal(e.data.T4[0].DN,false);
});
test('nonfinite register values are rejected', () => { const e=engine(); e.setValue('N7:0',Infinity); assert.equal(e.getValue('N7:0'),0); });
test('all bundled examples execute without exceptions', () => {
  for (const program of SAMPLE_PROGRAMS) { const e=engine(); for(let i=0;i<20;i++) e.executeScanCycle(program.rungs); assert.equal(e.data.S2.scanCount,20); }
});
test('imports reject malformed rungs and branch structures', () => {
  for (const value of [null, [], [null], [{items:null}], [rung({type:'SPLIT', branches:[null]})], [rung({type:'XIC',operand:{bad:1}})]]) assert.throws(()=>parseProgramFile(JSON.stringify(value)));
});
test('imports preserve examples and repair duplicate identifiers', () => {
  for (const p of SAMPLE_PROGRAMS) assert.equal(parseProgramFile(JSON.stringify(p.rungs)).length,p.rungs.length);
  const parsed=parseProgramFile(JSON.stringify([rung(ins('XIC','I:0/0'),ins('XIC','I:0/0'))]));
  assert.notEqual(parsed[0].items[0].id,parsed[0].items[1].id);
});
test('validation rejects nonexistent addresses and invalid presets',()=>{
  assert.ok(validateLadderLogic([rung(ins('OTE','O:0/99'))]).some(i=>i.severity==='error'));
  assert.ok(validateLadderLogic([rung(ins('TON','T4:0',{pre:'bad'}))]).some(i=>i.severity==='error'));
});

test('compare instructions (EQU, NEQ, GRT, GEQ, LES, LEQ) evaluate correctly and drive coils', () => {
  const e = engine();
  e.setValue('N7:0', 10);
  e.setValue('N7:1', 10);
  e.setValue('N7:2', 5);
  e.setValue('N7:3', 15);

  // EQU
  e.executeScanCycle([rung(ins('EQU', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:1' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), true, 'EQU true when equal');
  e.executeScanCycle([rung(ins('EQU', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:2' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), false, 'EQU false when not equal');

  // NEQ
  e.executeScanCycle([rung(ins('NEQ', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:2' }), ins('OTE', 'O:0/1'))]);
  assert.equal(e.getBit('O:0/1'), true, 'NEQ true when unequal');
  e.executeScanCycle([rung(ins('NEQ', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:1' }), ins('OTE', 'O:0/1'))]);
  assert.equal(e.getBit('O:0/1'), false, 'NEQ false when equal');

  // GRT (10 > 5 is true, 10 > 10 is false, 10 > 15 is false)
  e.executeScanCycle([rung(ins('GRT', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:2' }), ins('OTE', 'O:0/2'))]);
  assert.equal(e.getBit('O:0/2'), true, 'GRT 10 > 5 true');
  e.executeScanCycle([rung(ins('GRT', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:1' }), ins('OTE', 'O:0/2'))]);
  assert.equal(e.getBit('O:0/2'), false, 'GRT 10 > 10 false');

  // GEQ (10 >= 10 is true, 10 >= 5 is true, 10 >= 15 is false)
  e.executeScanCycle([rung(ins('GEQ', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:1' }), ins('OTE', 'O:0/3'))]);
  assert.equal(e.getBit('O:0/3'), true, 'GEQ 10 >= 10 true');
  e.executeScanCycle([rung(ins('GEQ', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:3' }), ins('OTE', 'O:0/3'))]);
  assert.equal(e.getBit('O:0/3'), false, 'GEQ 10 >= 15 false');

  // LES (10 < 15 is true, 10 < 10 is false, 10 < 5 is false)
  e.executeScanCycle([rung(ins('LES', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:3' }), ins('OTE', 'O:0/4'))]);
  assert.equal(e.getBit('O:0/4'), true, 'LES 10 < 15 true');
  e.executeScanCycle([rung(ins('LES', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:1' }), ins('OTE', 'O:0/4'))]);
  assert.equal(e.getBit('O:0/4'), false, 'LES 10 < 10 false');

  // LEQ (10 <= 10 is true, 10 <= 15 is true, 10 <= 5 is false)
  e.executeScanCycle([rung(ins('LEQ', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:1' }), ins('OTE', 'O:0/5'))]);
  assert.equal(e.getBit('O:0/5'), true, 'LEQ 10 <= 10 true');
  e.executeScanCycle([rung(ins('LEQ', 'N7:0', { sourceA: 'N7:0', sourceB: 'N7:2' }), ins('OTE', 'O:0/5'))]);
  assert.equal(e.getBit('O:0/5'), false, 'LEQ 10 <= 5 false');
});

test('LIM (Limit Test) evaluates standard and inverted wrap-around ranges', () => {
  const e = engine();
  e.setValue('N7:0', 7);

  // Normal range: Low Lim (5) <= Test (N7:0 = 7) <= High Lim (10) -> true
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '5', test: 'N7:0', highLim: '10' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), true, 'LIM 5 <= 7 <= 10 true');

  // Boundaries: 5 and 10
  e.setValue('N7:0', 5);
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '5', test: 'N7:0', highLim: '10' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), true, 'LIM test == lowLim boundary true');

  e.setValue('N7:0', 10);
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '5', test: 'N7:0', highLim: '10' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), true, 'LIM test == highLim boundary true');

  // Outside normal range
  e.setValue('N7:0', 4);
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '5', test: 'N7:0', highLim: '10' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), false, 'LIM 4 outside 5..10 false');

  e.setValue('N7:0', 11);
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '5', test: 'N7:0', highLim: '10' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), false, 'LIM 11 outside 5..10 false');

  // Inverted range: Low Lim (10) > High Lim (5)
  // True if test >= 10 OR test <= 5
  e.setValue('N7:0', 12);
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '10', test: 'N7:0', highLim: '5' }), ins('OTE', 'O:0/1'))]);
  assert.equal(e.getBit('O:0/1'), true, 'LIM inverted: 12 >= 10 true');

  e.setValue('N7:0', 3);
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '10', test: 'N7:0', highLim: '5' }), ins('OTE', 'O:0/1'))]);
  assert.equal(e.getBit('O:0/1'), true, 'LIM inverted: 3 <= 5 true');

  e.setValue('N7:0', 7);
  e.executeScanCycle([rung(ins('LIM', 'N7:0', { lowLim: '10', test: 'N7:0', highLim: '5' }), ins('OTE', 'O:0/1'))]);
  assert.equal(e.getBit('O:0/1'), false, 'LIM inverted: 7 between 5 and 10 false');
});

test('compare instructions evaluate timer accumulator (T4:0.ACC)', () => {
  const e = engine();
  e.data.T4[0].ACC = 5;
  e.executeScanCycle([rung(ins('GRT', 'T4:0.ACC', { sourceA: 'T4:0.ACC', sourceB: '3' }), ins('OTE', 'O:0/0'))]);
  assert.equal(e.getBit('O:0/0'), true, 'T4:0.ACC (5) > 3 true');

  e.executeScanCycle([rung(ins('LES', 'T4:0.ACC', { sourceA: 'T4:0.ACC', sourceB: '3' }), ins('OTE', 'O:0/1'))]);
  assert.equal(e.getBit('O:0/1'), false, 'T4:0.ACC (5) < 3 false');
});

test('timer status contacts (DN, EN, TT) map to timers and evaluate accurately', () => {
  const e = engine();
  // Timer T4:0 done, T4:1 timing
  e.data.T4[0].DN = true;
  e.data.T4[0].EN = true;
  e.data.T4[0].TT = false;

  e.data.T4[1].DN = false;
  e.data.T4[1].EN = true;
  e.data.T4[1].TT = true;

  // Contact examining T4:0.DN and T4:0/DN
  e.executeScanCycle([
    rung(ins('XIC', 'T4:0.DN'), ins('OTE', 'O:0/0')),
    rung(ins('XIC', 'T4:0/DN'), ins('OTE', 'O:0/1')),
    rung(ins('XIC', 'T4:1.TT'), ins('OTE', 'O:0/2')),
    rung(ins('XIC', 'T4:1.DN'), ins('OTE', 'O:0/3'))
  ]);

  assert.equal(e.getBit('O:0/0'), true, 'T4:0.DN drives O:0/0 true');
  assert.equal(e.getBit('O:0/1'), true, 'T4:0/DN drives O:0/1 true');
  assert.equal(e.getBit('O:0/2'), true, 'T4:1.TT drives O:0/2 true');
  assert.equal(e.getBit('O:0/3'), false, 'T4:1.DN is false so O:0/3 is false');
});

