// RSLogix 500 PLC Simulation Engine
import { normalizeAddress } from '../types/plcTypes.js';

export class PLCEngine {
  constructor(initialData) {
    this.data = initialData;
    this.isRunning = false;
    this.scanInterval = null;
    this.scanPeriodMs = 50; // 20 scans per second
    this.lastScanTime = performance.now();
    this.listeners = new Set();
    this.currentRungs = [];
    this.latchedOutputs = new Set(); // Tracks addresses set by OTL until OTU
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(scanResult) {
    this.listeners.forEach(fn => fn(this.data, scanResult));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastScanTime = performance.now();
    this.scanInterval = setInterval(() => {
      this.executeScanCycle();
    }, this.scanPeriodMs);
  }

  stop() {
    this.isRunning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  // Address lookup helper
  getBit(rawAddr) {
    const addr = normalizeAddress(rawAddr);
    if (!addr) return false;

    // Timer bit flags (T4:0.DN, T4:0.TT, T4:0.EN)
    if (addr.startsWith('T4:')) {
      const match = addr.match(/^T4:(\d+)(?:\.([A-Z]+))?$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const bit = (match[2] || 'DN').toUpperCase();
        const timer = this.data.T4[idx];
        if (timer) {
          if (bit === 'DN') return !!timer.DN;
          if (bit === 'TT') return !!timer.TT;
          if (bit === 'EN') return !!timer.EN;
        }
      }
      return false;
    }

    // Counter bit flags (C5:0.DN, C5:0.CU)
    if (addr.startsWith('C5:')) {
      const match = addr.match(/^C5:(\d+)(?:\.([A-Z]+))?$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const bit = (match[2] || 'DN').toUpperCase();
        const counter = this.data.C5?.[idx];
        if (counter) {
          if (bit === 'DN') return !!counter.DN;
          if (bit === 'CU') return !!counter.CU;
        }
      }
      return false;
    }

    // Direct bit from image table (I:0/0, O:0/0, B3:0/0, etc.)
    return !!this.data.bits[addr];
  }

  setBit(rawAddr, val) {
    const addr = normalizeAddress(rawAddr);
    if (!addr) return;
    this.data.bits[addr] = !!val;
  }

  getValue(rawAddr) {
    if (rawAddr === undefined || rawAddr === null) return 0;
    const addr = normalizeAddress(rawAddr);

    // Constant number
    if (/^-?\d+(\.\d+)?$/.test(addr)) {
      return parseFloat(addr);
    }

    // Integer register (N7:1)
    if (addr.startsWith('N7:')) {
      const idx = parseInt(addr.replace('N7:', ''), 10);
      if (!isNaN(idx) && idx >= 0 && idx < this.data.N7.length) {
        return this.data.N7[idx] || 0;
      }
      return 0;
    }

    // Timer ACC / PRE (T4:1.ACC)
    if (addr.startsWith('T4:')) {
      const match = addr.match(/^T4:(\d+)\.([A-Z]+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const field = match[2].toUpperCase();
        const timer = this.data.T4[idx];
        if (timer) {
          if (field === 'ACC') return timer.ACC;
          if (field === 'PRE') return timer.PRE;
        }
      }
      return this.getBit(addr) ? 1 : 0;
    }

    return this.getBit(addr) ? 1 : 0;
  }

  setValue(rawAddr, val) {
    const addr = normalizeAddress(rawAddr);
    if (!addr) return;
    const num = Number(val);

    if (addr.startsWith('N7:')) {
      const idx = parseInt(addr.replace('N7:', ''), 10);
      if (!isNaN(idx) && idx >= 0 && idx < this.data.N7.length) {
        this.data.N7[idx] = Math.round(num);
      }
      return;
    }

    this.setBit(addr, num !== 0);
  }

  // Execute authentic 4-phase scan cycle
  executeScanCycle(forceRungs = null) {
    const t0 = performance.now();
    const dtSeconds = Math.max(0.01, (t0 - this.lastScanTime) / 1000);
    this.lastScanTime = t0;

    const rungs = forceRungs || this.currentRungs || [];

    // Phase 1: Input Scan (simulated switches already in this.data.bits)

    // Phase 2: Logic Execution
    // To prevent unreferenced OTE outputs from staying stuck ON (e.g. Amber Lamp bug),
    // we track which outputs are controlled by OTE during this scan.
    const oteEvaluations = new Map(); // normalizedAddr -> boolean

    const rungEvaluations = [];
    for (let i = 0; i < rungs.length; i++) {
      const rung = rungs[i];
      if (!rung) continue;
      const rungEval = this.evaluateRung(rung, dtSeconds, oteEvaluations);
      rungEvaluations.push(rungEval);
    }

    // Phase 3: Output Update
    // Apply OTE coil results:
    // Any output address (O:0/0 .. O:0/7, B3:0/0 ..) that is NOT latched by an active OTL
    // takes its state from oteEvaluations. If it was NOT driven by any OTE coil in the active logic,
    // it resets to false (OFF)!
    for (let o = 0; o < 8; o++) {
      const oAddr = `O:0/${o}`;
      if (this.latchedOutputs.has(oAddr)) {
        this.data.bits[oAddr] = true;
      } else if (oteEvaluations.has(oAddr)) {
        this.data.bits[oAddr] = oteEvaluations.get(oAddr);
      } else {
        // Output not in program -> turn OFF!
        this.data.bits[oAddr] = false;
      }
    }

    // Internal binary bits B3
    for (let b = 0; b < 16; b++) {
      const bAddr = `B3:0/${b}`;
      if (this.latchedOutputs.has(bAddr)) {
        this.data.bits[bAddr] = true;
      } else if (oteEvaluations.has(bAddr)) {
        this.data.bits[bAddr] = oteEvaluations.get(bAddr);
      }
    }

    const tEnd = performance.now();
    this.data.S2.scanCount++;
    this.data.S2.lastScanMs = +(tEnd - t0).toFixed(2);
    this.data.S2.runTimeSec = +(this.data.S2.runTimeSec + dtSeconds).toFixed(1);

    const scanResult = {
      scanCount: this.data.S2.scanCount,
      scanTimeMs: this.data.S2.lastScanMs,
      rungEvaluations
    };

    this.notify(scanResult);
    return scanResult;
  }

  evaluateRung(rung, dtSeconds, oteEvaluations) {
    if (!rung || typeof rung !== 'object') {
      return { rungId: null, elements: {}, rungActive: false };
    }
    const evalData = {
      rungId: rung.id || `rung_${Math.random()}`,
      elements: {}, // elemId -> { active: bool, powerIn: bool, powerOut: bool }
      rungActive: false
    };

    let power = true;
    const items = Array.isArray(rung.items) ? rung.items : [];

    for (let i = 0; i < items.length; i++) {
      power = this.evaluateItem(items[i], power, dtSeconds, evalData, oteEvaluations);
    }

    evalData.rungActive = power;
    return evalData;
  }

  evaluateItem(item, powerIn, dtSeconds, evalData, oteEvaluations) {
    if (!item || typeof item !== 'object') return powerIn;

    // Parallel Split / Branch
    if (item.type === 'BRANCH' || item.type === 'SPLIT') {
      const branches = Array.isArray(item.branches) ? item.branches : [];
      const branchOuts = branches.map(subItems => {
        if (!Array.isArray(subItems)) return false;
        let bPower = powerIn;
        for (let j = 0; j < subItems.length; j++) {
          bPower = this.evaluateItem(subItems[j], bPower, dtSeconds, evalData, oteEvaluations);
        }
        return bPower;
      });

      // Power conducts through the split if power reached the split AND any parallel branch conducts
      const splitPowerOut = powerIn && branchOuts.some(Boolean);
      if (item.id) {
        evalData.elements[item.id] = {
          powerIn,
          powerOut: splitPowerOut,
          active: splitPowerOut
        };
      }
      return splitPowerOut;
    }

    const type = item.type;
    const operand = normalizeAddress(item.operand);
    const params = item.params || {};

    let active = false;
    let powerOut = powerIn;

    switch (type) {
      case 'XIC': {
        // Normally Open: conducts if bit is 1
        active = this.getBit(operand);
        powerOut = powerIn && active;
        break;
      }

      case 'XIO': {
        // Normally Closed: conducts if bit is 0
        active = !this.getBit(operand);
        powerOut = powerIn && active;
        break;
      }

      case 'OTE': {
        // Standard Coil: tracks state into oteEvaluations
        active = powerIn;
        if (operand) {
          oteEvaluations.set(operand, powerIn);
        }
        powerOut = powerIn;
        break;
      }

      case 'OTL': {
        // Latch Output: if rung is true, latches bit ON
        if (powerIn && operand) {
          this.latchedOutputs.add(operand);
          this.setBit(operand, true);
        }
        active = operand ? this.latchedOutputs.has(operand) : false;
        powerOut = powerIn;
        break;
      }

      case 'OTU': {
        // Unlatch Output: if rung is true, removes latch and sets to false
        if (powerIn && operand) {
          this.latchedOutputs.delete(operand);
          this.setBit(operand, false);
          if (oteEvaluations.has(operand)) {
            oteEvaluations.set(operand, false);
          }
        }
        active = operand ? !this.latchedOutputs.has(operand) : false;
        powerOut = powerIn;
        break;
      }

      case 'TON': {
        // Timer On Delay
        const tIdx = parseInt(String(operand).replace(/^T4:/, ''), 10) || 0;
        const timer = this.data.T4[tIdx] || { PRE: 1.0, ACC: 0.0, EN: false, TT: false, DN: false };
        if (params.pre !== undefined) timer.PRE = parseFloat(params.pre);

        if (powerIn) {
          timer.EN = true;
          if (timer.ACC < timer.PRE) {
            timer.TT = true;
            timer.DN = false;
            timer.ACC = +(timer.ACC + dtSeconds).toFixed(2);
            if (timer.ACC >= timer.PRE) {
              timer.ACC = timer.PRE;
              timer.TT = false;
              timer.DN = true;
            }
          } else {
            timer.TT = false;
            timer.DN = true;
          }
        } else {
          timer.EN = false;
          timer.TT = false;
          timer.DN = false;
          timer.ACC = 0.0;
        }
        active = timer.DN;
        powerOut = powerIn;
        break;
      }

      case 'RES': {
        // Reset Timer
        if (powerIn) {
          const tIdx = parseInt(String(operand).replace(/^T4:/, ''), 10) || 0;
          if (this.data.T4[tIdx]) {
            this.data.T4[tIdx].ACC = 0.0;
            this.data.T4[tIdx].EN = false;
            this.data.T4[tIdx].TT = false;
            this.data.T4[tIdx].DN = false;
          }
        }
        active = powerIn;
        powerOut = powerIn;
        break;
      }

      case 'EQU': {
        const srcA = this.getValue(params.sourceA !== undefined ? params.sourceA : operand);
        const srcB = this.getValue(params.sourceB !== undefined ? params.sourceB : 1);
        active = (srcA === srcB);
        powerOut = powerIn && active;
        break;
      }

      case 'MOV': {
        const srcVal = this.getValue(params.source !== undefined ? params.source : operand);
        const dst = params.dest || 'N7:1';
        if (powerIn) {
          this.setValue(dst, srcVal);
        }
        active = powerIn;
        powerOut = powerIn;
        break;
      }

      case 'ADD': {
        const valA = this.getValue(params.sourceA !== undefined ? params.sourceA : operand);
        const valB = this.getValue(params.sourceB !== undefined ? params.sourceB : 1);
        const dst = params.dest || operand || 'N7:0';
        if (powerIn) {
          this.setValue(dst, valA + valB);
        }
        active = powerIn;
        powerOut = powerIn;
        break;
      }

      case 'SUB': {
        const valA = this.getValue(params.sourceA !== undefined ? params.sourceA : operand);
        const valB = this.getValue(params.sourceB !== undefined ? params.sourceB : 1);
        const dst = params.dest || operand || 'N7:0';
        if (powerIn) {
          this.setValue(dst, valA - valB);
        }
        active = powerIn;
        powerOut = powerIn;
        break;
      }

      case 'MUL': {
        const valA = this.getValue(params.sourceA !== undefined ? params.sourceA : operand);
        const valB = this.getValue(params.sourceB !== undefined ? params.sourceB : 1);
        const dst = params.dest || operand || 'N7:0';
        if (powerIn) {
          this.setValue(dst, valA * valB);
        }
        active = powerIn;
        powerOut = powerIn;
        break;
      }

      case 'DIV': {
        const valA = this.getValue(params.sourceA !== undefined ? params.sourceA : operand);
        const valB = this.getValue(params.sourceB !== undefined ? params.sourceB : 1);
        const dst = params.dest || operand || 'N7:0';
        if (powerIn) {
          this.setValue(dst, valB !== 0 ? Math.floor(valA / valB) : 0);
        }
        active = powerIn;
        powerOut = powerIn;
        break;
      }

      default:
        powerOut = powerIn;
        break;
    }

    if (item.id) {
      evalData.elements[item.id] = {
        powerIn,
        powerOut,
        active
      };
    }

    return powerOut;
  }
}
