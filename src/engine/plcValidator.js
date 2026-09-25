// RSLogix 500 Ladder Logic Validator & Diagnostic Engine
// Provides clear, express diagnostic messages stating what the error is and how to fix it.
import { normalizeAddress, INSTRUCTION_TYPES } from '../types/plcTypes.js';

export function validateLadderLogic(rungs) {
  const issues = [];
  const oteAddresses = new Map(); // addr -> [rungIdx]

  if (!rungs || !Array.isArray(rungs) || rungs.length === 0) {
    return [
      {
        severity: 'error',
        rungIdx: 0,
        title: 'No Ladder Rungs',
        message: 'The program has no rungs.',
        fix: 'Click "+ Add New Rung" to begin building your ladder logic.'
      }
    ];
  }

  rungs.forEach((rung, rIdx) => {
    if (!rung || typeof rung !== 'object') return;
    const items = Array.isArray(rung.items) ? rung.items : [];

    // 1. Check for empty rung
    if (items.length === 0) {
      issues.push({
        severity: 'error',
        rungIdx: rIdx,
        title: `Empty Rung ${rIdx}`,
        message: `Rung ${rIdx} has no instructions or contacts.`,
        fix: `Drag a contact (e.g. -[ ]- XIC) and an output coil (e.g. -( )- OTE) onto Rung ${rIdx}.`
      });
      return;
    }

    let hasOutput = false;
    let hasInput = false;

    // Helper to inspect elements recursively
    const checkItem = (item) => {
      if (!item) return;
      if (!Object.hasOwn(INSTRUCTION_TYPES, item.type)) {
        issues.push({ severity: 'error', rungIdx: rIdx, elemId: item.id, message: `Unsupported instruction: ${item.type}.`, fix: 'Choose an available instruction from the palette.' });
        return;
      }

      if (item.type === 'SPLIT' || item.type === 'BRANCH') {
        const branches = Array.isArray(item.branches) ? item.branches : [];
        if (branches.length < 2) {
          issues.push({
            severity: 'error',
            rungIdx: rIdx,
            elemId: item.id,
            title: `Incomplete Parallel Split on Rung ${rIdx}`,
            message: `A parallel split branch must contain at least 2 alternate paths.`,
            fix: `Add a contact into Path A and Path B, or delete the split branch.`
          });
        }
        branches.forEach((b, bIdx) => {
          if (!Array.isArray(b) || b.length === 0) {
            issues.push({
              severity: 'error',
              rungIdx: rIdx,
              elemId: item.id,
              title: `Empty Branch Path on Rung ${rIdx}`,
              message: `Path ${bIdx === 0 ? 'A' : 'B'} of the parallel split has no contacts. A direct short without a contact will bypass the other path.`,
              fix: `Drag an input contact into Path ${bIdx === 0 ? 'A' : 'B'}, or remove the empty branch.`
            });
          } else {
            b.forEach(checkItem);
          }
        });
        hasInput = true;
        return;
      }

      const isOut = ['OTE', 'OTL', 'OTU', 'TON', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(item.type);
      if (isOut) hasOutput = true;
      else hasInput = true;

      const address = normalizeAddress(item.operand);
      const bitAddress = /^(?:[IO]:0\/[0-7]|B3:0\/(?:[0-9]|1[0-5])|T4:[0-9]\.(?:DN|TT|EN))$/;
      const coilAddress = /^(?:O:0\/[0-7]|B3:0\/(?:[0-9]|1[0-5]))$/;
      const valid = ['XIC','XIO'].includes(item.type) ? bitAddress.test(address)
        : ['OTE','OTL','OTU'].includes(item.type) ? coilAddress.test(address)
        : ['TON','RES'].includes(item.type) ? /^T4:[0-9]$/.test(address) : true;
      if (address && !valid) issues.push({ severity: 'error', rungIdx: rIdx, elemId: item.id,
        message: `${item.type} on rung ${rIdx} has an invalid or unavailable address: ${address}.`,
        fix: 'Choose an address compatible with this instruction from the address picker.' });

      // Check operand presence
      if (!item.operand || String(item.operand).trim() === '') {
        issues.push({
          severity: 'error',
          rungIdx: rIdx,
          elemId: item.id,
          title: `Missing Address on Rung ${rIdx}`,
          message: `The ${item.type} instruction has no address assigned.`,
          fix: `Drag an I/O address from the palette (e.g. Switch 1 I:0/0 or Amber Lamp O:0/0) onto this instruction.`
        });
      }

      // Check illegal output driving physical input
      if (['OTE', 'OTL', 'OTU'].includes(item.type) && item.operand) {
        const norm = String(item.operand).toUpperCase().trim();
        if (norm.startsWith('I:') || norm.startsWith('I1:') || norm.startsWith('I0:')) {
          issues.push({
            severity: 'error',
            rungIdx: rIdx,
            elemId: item.id,
            title: `Invalid Output Target: Physical Input (${norm})`,
            message: `Instruction ${item.type} on Rung ${rIdx} is attempting to drive physical input address ${norm}. Output instructions cannot overwrite physical inputs!`,
            fix: `Change the coil address to an output (e.g. O:0/0) or an internal binary bit (e.g. B3:0/0).`
          });
        }
      }

      // Check timer preset
      if (item.type === 'TON' || item.type === 'TOF' || item.type === 'RTO') {
        const pre = item.params?.pre;
        if (pre !== undefined && (!Number.isFinite(Number(pre)) || Number(pre) < 0)) {
          issues.push({
            severity: 'error',
            rungIdx: rIdx,
            elemId: item.id,
            title: `Invalid Timer Preset on Rung ${rIdx}`,
            message: `Timer ${item.operand || 'T4:0'} has an invalid preset time of ${pre}s.`,
            fix: `Set a finite, nonnegative time in seconds.`
          });
        }
      }

      // Track duplicate OTE coils
      if (item.type === 'OTE' && item.operand) {
        const normalized = String(item.operand).toUpperCase().trim();
        if (!oteAddresses.has(normalized)) oteAddresses.set(normalized, []);
        oteAddresses.get(normalized).push(rIdx);
      }
    };

    items.forEach(checkItem);

    // Check if rung has no output instruction
    if (!hasOutput) {
      issues.push({
        severity: 'error',
        rungIdx: rIdx,
        title: `No Output on Rung ${rIdx}`,
        message: `Rung ${rIdx} has input conditions but no output coil or timer. Power will flow into an open circuit with no effect.`,
        fix: `Drag an output coil (-( )- OTE, -(L)- OTL, or [TON]) from the palette to the right side of Rung ${rIdx}.`
      });
    }
  });

  // Check duplicate OTE warning (Slide 23 PLC Scan Cycle conflict)
  oteAddresses.forEach((rungList, addr) => {
    if (rungList.length > 1) {
      issues.push({
        severity: 'warning',
        rungIdx: rungList[0],
        title: `Duplicate OTE Coil (${addr})`,
        message: `Address ${addr} is assigned to multiple OTE instructions on rungs: ${rungList.join(', ')}. In cyclic PLC scanning, the last rung will overwrite earlier rungs!`,
        fix: `Combine the conditions using a Parallel Split branch on a single rung, or use Latch -(L)- and Unlatch -(U)- instead.`
      });
    }
  });

  return issues;
}
