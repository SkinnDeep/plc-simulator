import React, { useState } from 'react';
import { Sparkles, Move, GitFork } from 'lucide-react';

export function InstructionPalette({
  onAddInstruction,
  isBranchMode,
  onToggleBranchMode,
  onSelectIoToken,
  hasSelection
}) {
  const [activeCategory, setActiveCategory] = useState('Bit');

  const categories = ['Bit', 'Timer/Counter', 'Math', 'Move/Logical', 'Compare'];

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
    <div className="flex items-center gap-1">
      {icons.map(inst => (
        <button
          key={inst.type}
          aria-label={inst.name}
          draggable={!inst.isBranch}
          onDragStart={(e) => !inst.isBranch && handleDragStart(e, { kind: 'instruction', type: inst.type, isOutput: inst.isOutput })}
          onClick={() => inst.isBranch ? onToggleBranchMode() : onAddInstruction(inst.type)}
          className={`flex flex-col items-center justify-center min-w-[36px] h-[32px] rounded border font-mono text-xs cursor-pointer shadow-sm transition active:scale-95 group px-1 ${
            inst.isBranch && isBranchMode
              ? 'bg-blue-500/20 border-blue-400 text-blue-300'
              : 'bg-transparent border-transparent hover:bg-[#2d2d2d] text-slate-300 hover:text-white'
          }`}
          title={inst.name}
        >
          <span className={`font-semibold ${inst.isBranch && isBranchMode ? 'text-blue-400' : ''}`}>{inst.symbol}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div id="tour-palette" className="bg-[#1e1e1e] border-b border-[#2d2d2d] flex flex-col select-none shadow-sm">
      {/* Category Tabs (Matches Picture) */}
      <div className="flex items-center gap-4 px-3 pt-2 pb-1 overflow-x-auto text-sm font-medium">
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
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 min-h-[44px] bg-[#1a1a1a]">
        {activeCategory === 'Bit' && renderIcons(bitIcons)}
        {activeCategory === 'Timer/Counter' && renderIcons(timerIcons)}
        {activeCategory === 'Math' && renderIcons(mathIcons)}
        {activeCategory === 'Compare' && renderIcons(compareIcons)}
        {activeCategory === 'Move/Logical' && renderIcons(moveIcons)}
      </div>
    </div>
  );
}
export default InstructionPalette;
