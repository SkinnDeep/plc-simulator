// RSLogix 500 PLC Simulator Types and Constants

export const PLC_MODES = {
  RUN: 'RUN',
  PROGRAM: 'PROG'
};

export const INSTRUCTION_TYPES = {
  XIC: 'XIC', // Examine If Closed -[ ]-
  XIO: 'XIO', // Examine If Open -[/]-
  OTE: 'OTE', // Output Energize -( )-
  OTL: 'OTL', // Output Latch -(L)-
  OTU: 'OTU', // Output Unlatch -(U)-
  TON: 'TON', // Timer On Delay
  RES: 'RES', // Reset Timer
  EQU: 'EQU', // Equal
  MOV: 'MOV', // Move
  BRANCH: 'BRANCH', // Parallel branch
  SPLIT: 'SPLIT' // Parallel split branch
};

export const INSTRUCTION_METADATA = {
  XIC: { name: 'XIC', symbol: '-[ ]-', desc: 'Normally Open Switch / Contact', category: 'Bit' },
  XIO: { name: 'XIO', symbol: '-[/]-', desc: 'Normally Closed (Inverted)', category: 'Bit' },
  OTE: { name: 'OTE', symbol: '-( )-', desc: 'Output Lamp / Coil', category: 'Bit', isOutput: true },
  OTL: { name: 'OTL', symbol: '-(L)-', desc: 'Latch Output (Stays ON)', category: 'Bit', isOutput: true },
  OTU: { name: 'OTU', symbol: '-(U)-', desc: 'Unlatch Output (Turns OFF)', category: 'Bit', isOutput: true },
  TON: { name: 'TON', symbol: '[TON]', desc: 'Timer On Delay', category: 'Timer', isBlock: true, isOutput: true },
  RES: { name: 'RES', symbol: '-(RES)-', desc: 'Reset Timer', category: 'Timer', isOutput: true },
  EQU: { name: 'EQU', symbol: '[EQU]', desc: 'Equal (Compare Value)', category: 'Compare', isBlock: true },
  MOV: { name: 'MOV', symbol: '[MOV]', desc: 'Move Register Value', category: 'Move', isBlock: true, isOutput: true },
  BRANCH: { name: 'Branch', symbol: '[+]', desc: 'Parallel Branch (OR logic)', category: 'Structure' },
  SPLIT: { name: 'Split Branch', symbol: '[+]', desc: 'Parallel Split Branch (OR logic)', category: 'Structure' }
};

export const COMMON_ADDRESSES = [
  { addr: 'I:0/0', name: 'Switch 1', type: 'input' },
  { addr: 'I:0/1', name: 'Switch 2', type: 'input' },
  { addr: 'I:0/2', name: 'Green Button (PB1)', type: 'input' },
  { addr: 'I:0/3', name: 'Red Button (PB2)', type: 'input' },
  { addr: 'O:0/0', name: 'Amber Lamp 1', type: 'output' },
  { addr: 'O:0/1', name: 'Blue Lamp 2', type: 'output' },
  { addr: 'O:0/2', name: 'Green Lamp 3', type: 'output' },
  { addr: 'O:0/3', name: 'Red Lamp 4', type: 'output' },
  { addr: 'T4:0.DN', name: 'Timer T4:0 Done', type: 'timer' },
  { addr: 'T4:1.DN', name: 'Timer T4:1 Done', type: 'timer' },
  { addr: 'T4:2.DN', name: 'Timer T4:2 Done', type: 'timer' },
  { addr: 'N7:1', name: 'Sequencer Step (N7:1)', type: 'integer' },
  { addr: 'B3:0/0', name: 'Internal Relay B3:0/0', type: 'internal' }
];

export function normalizeAddress(raw) {
  if (raw === undefined || raw === null) return '';
  let s = String(raw).trim().toUpperCase();
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;

  // I:0/0
  const iMatch = s.match(/^I[:.]?0?[/.]?(\d+)$/);
  if (iMatch) return `I:0/${iMatch[1]}`;

  // O:0/0
  const oMatch = s.match(/^O[:.]?0?[/.]?(\d+)$/);
  if (oMatch) return `O:0/${oMatch[1]}`;

  // B3:0/0
  const bMatch = s.match(/^B3?[:.]?0?[/.]?(\d+)$/);
  if (bMatch) return `B3:0/${bMatch[1]}`;

  // T4:0.DN or T4:0/DN
  const tMatch = s.match(/^T4?[:.]?(\d+)[/.]?([A-Z]+)?$/);
  if (tMatch) {
    const idx = tMatch[1];
    const bit = tMatch[2] ? tMatch[2].toUpperCase() : '';
    return bit ? `T4:${idx}.${bit}` : `T4:${idx}`;
  }

  // N7:1
  const nMatch = s.match(/^N7?[:.]?(\d+)$/);
  if (nMatch) return `N7:${nMatch[1]}`;

  return s;
}

export function createInitialDataModel() {
  const bits = {};

  // Inputs
  for (let i = 0; i < 8; i++) bits[`I:0/${i}`] = false;
  // Outputs
  for (let i = 0; i < 8; i++) bits[`O:0/${i}`] = false;
  // Binary internal
  for (let i = 0; i < 16; i++) bits[`B3:0/${i}`] = false;

  return {
    bits,
    T4: Array.from({ length: 10 }, (_, i) => ({
      id: `T4:${i}`,
      EN: false,
      TT: false,
      DN: false,
      PRE: 1.0,
      ACC: 0.0,
      timeBase: 1.0
    })),
    N7: Array.from({ length: 16 }, () => 0),
    S2: {
      scanCount: 0,
      lastScanMs: 0.5,
      runTimeSec: 0
    }
  };
}
