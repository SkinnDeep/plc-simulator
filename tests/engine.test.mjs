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
