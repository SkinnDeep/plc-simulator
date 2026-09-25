import { INSTRUCTION_TYPES } from '../types/plcTypes.js';

// Imported files are untrusted: validate structure before they reach the renderer.
export function parseProgramFile(text) {
  const rungs = JSON.parse(text);
  if (!Array.isArray(rungs) || !rungs.length || rungs.length > 500) throw new Error('Use a program containing 1–500 rungs.');
  let count = 0;
  function item(raw, depth = 0) {
    if (++count > 5000 || depth > 12) throw new Error('Program is too large or branches are nested too deeply.');
    if (!raw || !Object.hasOwn(INSTRUCTION_TYPES, raw.type)) throw new Error('Program contains an unsupported instruction.');
    if (raw.operand != null && !['string', 'number'].includes(typeof raw.operand)) throw new Error('Instruction addresses must be text.');
    if (raw.params != null && (typeof raw.params !== 'object' || Array.isArray(raw.params) || Object.values(raw.params).some(v => !['string', 'number', 'boolean'].includes(typeof v)))) throw new Error('Invalid instruction parameters.');
    const result = { ...raw, id: `import-item-${count}` };
    if (raw.desc != null && typeof raw.desc !== 'string') throw new Error('Instruction descriptions must be text.');
    if (['BRANCH', 'SPLIT'].includes(raw.type)) {
      if (!Array.isArray(raw.branches) || raw.branches.some(b => !Array.isArray(b))) throw new Error('Each branch must contain instruction paths.');
      result.branches = raw.branches.map(b => b.map(i => item(i, depth + 1)));
    }
    return result;
  }
  return rungs.map((r, index) => {
    if (!r || !Array.isArray(r.items) || (r.comment != null && typeof r.comment !== 'string')) throw new Error('Each rung needs an instruction list and a text comment.');
    return { ...r, id: `import-rung-${index}`, items: r.items.map(i => item(i)) };
  });
}
