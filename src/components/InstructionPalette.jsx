import React, { useState } from 'react';


export function InstructionPalette({
  disabled = false,
  onAddInstruction,
  isBranchMode,
  onToggleBranchMode,
  onSelectIoToken,
  hasSelection
}) {
  const [activeCategory, setActiveCategory] = useState('Bit');

  const categories = ['Bit', 'Timers', 'Math', 'Move / logic', 'Compare'];

  const bitIcons = [
    { type: 'BRANCH', symbol: '┼──┼', name: 'Branch', isBranch: true },
    { type: 'XIC', symbol: '─] [─', name: 'XIC' },
    { type: 'XIO', symbol: '─]/[─', name: 'XIO' },
    { type: 'OTE', symbol: '─( )─', name: 'OTE', isOutput: true },
    { type: 'OTL', symbol: '─(L)─', name: 'OTL', isOutput: true },
    { type: 'OTU', symbol: '─(U)─', name: 'OTU', isOutput: true },
    { type: 'ONS', symbol: '[ONS]', name: 'ONS' },
    { type: 'OSR', symbol: 'OSR', name: 'OSR' },
    { type: 'OSF', symbol: 'OSF', name: 'OSF' },
  ];

  const timerIcons = [
    { type: 'TON', symbol: '[TON]', name: 'Timer On Delay', isOutput: true },
    { type: 'RES', symbol: '-(RES)-', name: 'Reset', isOutput: true },
  ];

  const mathIcons = [
    { type: 'ADD', symbol: '[ADD]', name: 'Add', isOutput: true },
    { type: 'SUB', symbol: '[SUB]', name: 'Subtract', isOutput: true },
    { type: 'MUL', symbol: '[MUL]', name: 'Multiply', isOutput: true },
    { type: 'DIV', symbol: '[DIV]', name: 'Divide', isOutput: true },
  ];

  const compareIcons = [
    { type: 'EQU', symbol: '[EQU]', name: 'Equal' },
  ];

  const moveIcons = [
    { type: 'MOV', symbol: '[MOV]', name: 'Move', isOutput: true },
  ];

  const handleDragStart = (e, dragData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const getInstTheme = (inst) => {
    if (inst.isBranch) {
      return isBranchMode 
        ? 'border-blue-400 bg-blue-500/25 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.35)]' 
        : 'border-blue-500/35 bg-blue-950/20 text-blue-300 hover:border-blue-400 hover:bg-blue-900/40 hover:text-blue-200';
    }
    if (inst.type === 'XIC' || inst.type === 'XIO') {
      return 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 hover:text-cyan-200';
    }
    if (inst.isOutput || ['OTE', 'OTL', 'OTU'].includes(inst.type)) {
      return 'border-amber-500/30 bg-amber-950/20 text-amber-300 hover:border-amber-400 hover:bg-amber-900/40 hover:text-amber-200';
    }
    if (['TON', 'RES'].includes(inst.type)) {
      return 'border-purple-500/30 bg-purple-950/20 text-purple-300 hover:border-purple-400 hover:bg-purple-900/40 hover:text-purple-200';
    }
    if (['ADD', 'SUB', 'MUL', 'DIV'].includes(inst.type)) {
      return 'border-teal-500/30 bg-teal-950/20 text-teal-300 hover:border-teal-400 hover:bg-teal-900/40 hover:text-teal-200';
    }
    if (inst.type === 'EQU') {
      return 'border-orange-500/30 bg-orange-950/20 text-orange-300 hover:border-orange-400 hover:bg-orange-900/40 hover:text-orange-200';
    }
    if (inst.type === 'MOV') {
      return 'border-sky-500/30 bg-sky-950/20 text-sky-300 hover:border-sky-400 hover:bg-sky-900/40 hover:text-sky-200';
    }
    if (['ONS', 'OSR', 'OSF'].includes(inst.type)) {
      return 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-900/40 hover:text-indigo-200';
    }
    return 'border-slate-700/60 bg-slate-900/30 text-slate-300 hover:border-slate-500 hover:bg-slate-800';
  };

  const renderIcons = (icons) => (
    <div className="instruction-buttons">
      {icons.map(inst => (
        <button
          key={inst.type}
          disabled={disabled}
          aria-label={inst.name}
          draggable={!disabled && !inst.isBranch}
          onDragStart={(e) => !inst.isBranch && handleDragStart(e, { kind: 'instruction', type: inst.type, isOutput: inst.isOutput })}
          onClick={() => inst.isBranch ? onToggleBranchMode() : onAddInstruction(inst.type)}
          className={`instruction-button border transition-all ${getInstTheme(inst)}`}
          title={inst.name}
        >
          <span className="instruction-symbol">{inst.symbol}</span>
          <span className="instruction-name">{inst.type === 'BRANCH' ? 'Branch' : inst.type}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div id="tour-palette" className="instruction-palette">
      {/* Category Tabs (Matches Picture) */}
      <div className="palette-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            aria-pressed={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className={`transition whitespace-nowrap cursor-pointer hover:text-white ${
              activeCategory === cat
                ? 'text-white border-b-2 border-cyan-500 pb-0.5'
                : 'text-slate-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Item Strip */}
      <div className="palette-strip">
        {activeCategory === 'Bit' && renderIcons(bitIcons)}
        {activeCategory === 'Timers' && renderIcons(timerIcons)}
        {activeCategory === 'Math' && renderIcons(mathIcons)}
        {activeCategory === 'Compare' && renderIcons(compareIcons)}
        {activeCategory === 'Move / logic' && renderIcons(moveIcons)}
      </div>
    </div>
  );
}
export default InstructionPalette;
