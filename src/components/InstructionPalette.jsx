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
          className={`instruction-button ${
            inst.isBranch && isBranchMode
              ? 'bg-blue-500/20 border-blue-400 text-blue-300'
              : 'bg-transparent border-transparent hover:bg-[#2d2d2d] text-slate-300 hover:text-white'
          }`}
          title={inst.name}
        >
          <span className="instruction-symbol">{inst.symbol}</span><span className="instruction-name">{inst.type === 'BRANCH' ? 'Branch' : inst.type}</span>
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
