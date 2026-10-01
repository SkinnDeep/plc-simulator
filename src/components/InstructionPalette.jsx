import React, { useState } from 'react';


export function InstructionPalette({
  disabled = false,
  onAddInstruction,
  isBranchMode,
  onToggleBranchMode,
  onSelectIoToken,
  hasSelection,
  existingTimers = ['T4:0'],
  symbols = {},
  activeSandbox = 'HardwareTrainer'
}) {
  const [activeCategory, setActiveCategory] = useState('Bit');
  const [mappedTimer, setMappedTimer] = useState(existingTimers[0] || 'T4:0');

  // Keep mappedTimer aligned with existing timers if list changes
  React.useEffect(() => {
    if (existingTimers.length > 0 && !existingTimers.includes(mappedTimer)) {
      setMappedTimer(existingTimers[0]);
    }
  }, [existingTimers, mappedTimer]);

  const categories = ['Bit', 'Timers', 'I/O & Tags', 'Math', 'Move / logic', 'Compare'];

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
    { type: 'TOF', symbol: '[TOF]', name: 'Timer Off Delay', isOutput: true },
    { type: 'RTO', symbol: '[RTO]', name: 'Retentive Timer On', isOutput: true },
    { type: 'RES', symbol: '-(RES)-', name: 'Reset Timer', isOutput: true },
  ];

  const mathIcons = [
    { type: 'ADD', symbol: '[ADD]', name: 'Add', isOutput: true },
    { type: 'SUB', symbol: '[SUB]', name: 'Subtract', isOutput: true },
    { type: 'MUL', symbol: '[MUL]', name: 'Multiply', isOutput: true },
    { type: 'DIV', symbol: '[DIV]', name: 'Divide', isOutput: true },
  ];

  const compareIcons = [
    { type: 'EQU', symbol: '[EQU]', name: 'Equal' },
    { type: 'NEQ', symbol: '[NEQ]', name: 'Not Equal' },
    { type: 'GRT', symbol: '[GRT]', name: 'Greater Than' },
    { type: 'GEQ', symbol: '[GEQ]', name: 'Greater Than or Equal' },
    { type: 'LES', symbol: '[LES]', name: 'Less Than' },
    { type: 'LEQ', symbol: '[LEQ]', name: 'Less Than or Equal' },
    { type: 'LIM', symbol: '[LIM]', name: 'Limit Test' },
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
    if (['TON', 'TOF', 'RTO', 'RES'].includes(inst.type)) {
      return 'border-purple-500/30 bg-purple-950/20 text-purple-300 hover:border-purple-400 hover:bg-purple-900/40 hover:text-purple-200';
    }
    if (['ADD', 'SUB', 'MUL', 'DIV'].includes(inst.type)) {
      return 'border-teal-500/30 bg-teal-950/20 text-teal-300 hover:border-teal-400 hover:bg-teal-900/40 hover:text-teal-200';
    }
    if (['EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ', 'LIM'].includes(inst.type)) {
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

  const availableTags = React.useMemo(() => {
    const list = [];
    const inputCount = activeSandbox === 'MetalShear' ? 5 : 4;
    for (let i = 0; i < inputCount; i++) {
      const addr = `I:0/${i}`;
      list.push({ addr, label: symbols?.[addr] || (activeSandbox === 'MetalShear' ? ['START_PB', 'STOP_PB', 'PROX', 'DOWN_LS', 'UP_LS'][i] : `Switch ${i+1}`), group: 'Input', isOutput: false });
    }
    for (let o = 0; o < 4; o++) {
      const addr = `O:0/${o}`;
      list.push({ addr, label: symbols?.[addr] || (activeSandbox === 'MetalShear' ? ['CONV1', 'CONV2', 'SHEAR', 'CONV3'][o] : `Lamp ${o+1}`), group: 'Output', isOutput: true });
    }
    for (let b = 0; b < 3; b++) {
      const addr = `B3:0/${b}`;
      list.push({ addr, label: symbols?.[addr] || (activeSandbox === 'MetalShear' && b === 0 ? 'RUN_RELAY' : `Relay ${b}`), group: 'Internal', isOutput: false });
    }
    existingTimers.forEach(t => {
      list.push({ addr: `${t}.DN`, label: `${t} Done Bit`, group: 'Timer', isOutput: false });
      list.push({ addr: `${t}.TT`, label: `${t} Timing Bit`, group: 'Timer', isOutput: false });
      list.push({ addr: `${t}.EN`, label: `${t} Enable Bit`, group: 'Timer', isOutput: false });
    });
    list.push({ addr: 'N7:0', label: symbols?.['N7:0'] || 'Int 0', group: 'Register', isOutput: false });
    Object.keys(symbols || {}).forEach(addr => {
      if (!list.some(x => x.addr === addr)) {
        list.push({ addr, label: symbols[addr], group: 'Custom', isOutput: addr.startsWith('O:') });
      }
    });
    return list;
  }, [activeSandbox, symbols, existingTimers]);

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
                ? 'text-white border-b-2 border-cyan-500 pb-0.5 font-bold'
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
        {activeCategory === 'Timers' && (
          <div className="flex flex-wrap items-center gap-2">
            {renderIcons(timerIcons)}

            <div className="h-7 w-[1px] bg-slate-700/60 mx-1 shrink-0" />

            <div className="flex items-center gap-2 bg-purple-950/25 border border-purple-500/35 rounded-lg px-2.5 py-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-purple-300 font-bold uppercase tracking-wider">Map To:</span>
                <select
                  value={mappedTimer}
                  onChange={(e) => setMappedTimer(e.target.value)}
                  className="bg-slate-900 border border-purple-500/50 text-purple-200 text-xs font-mono font-bold rounded px-1.5 py-0.5 focus:outline-none cursor-pointer hover:border-purple-400"
                  title="Select which existing timer to map DN, TT, or EN to"
                >
                  {existingTimers.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  {['T4:0', 'T4:1', 'T4:2', 'T4:3'].filter(t => !existingTimers.includes(t)).map(t => (
                    <option key={t} value={t}>{t} (New)</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { bit: 'DN', name: 'Timer Done', desc: 'Done Bit (DN)' },
                  { bit: 'TT', name: 'Timer Timing', desc: 'Timing Bit (TT)' },
                  { bit: 'EN', name: 'Timer Enable', desc: 'Enable Bit (EN)' },
                ].map(item => {
                  const fullAddr = `${mappedTimer}.${item.bit}`;
                  return (
                    <button
                      key={item.bit}
                      disabled={disabled}
                      aria-label={`${item.name} (${fullAddr})`}
                      draggable={!disabled}
                      onDragStart={(e) => handleDragStart(e, {
                        kind: 'instruction',
                        type: 'XIC',
                        operand: fullAddr,
                        timerBit: item.bit,
                        name: item.name
                      })}
                      onClick={() => onAddInstruction('XIC', fullAddr)}
                      className="instruction-button border border-purple-500/40 bg-purple-950/30 hover:border-purple-400 hover:bg-purple-900/50 text-purple-200 flex flex-col items-center justify-center px-2 py-0.5 rounded transition-all cursor-pointer shadow-sm group min-w-[50px]"
                      title={`Drag or click to add ${item.name} mapped to ${fullAddr}`}
                    >
                      <span className="instruction-symbol text-[10px] text-cyan-300 group-hover:text-cyan-200">─] [─</span>
                      <span className="instruction-name text-[10px] font-bold text-purple-200">{item.bit}</span>
                      <span className="text-[8px] font-mono text-purple-300/80 leading-none">{fullAddr}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {activeCategory === 'I/O & Tags' && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
            <span className="text-[10px] text-slate-400 font-mono shrink-0 mr-1 flex items-center gap-1">
              <span>⠿ Drag tag to rung:</span>
            </span>
            {availableTags.map(tag => {
              const theme = tag.isOutput 
                ? 'border-amber-500/40 bg-amber-950/25 text-amber-200 hover:border-amber-400 hover:bg-amber-900/40'
                : tag.group === 'Timer'
                ? 'border-purple-500/40 bg-purple-950/25 text-purple-200 hover:border-purple-400 hover:bg-purple-900/40'
                : tag.group === 'Internal'
                ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-900/40'
                : 'border-cyan-500/40 bg-cyan-950/25 text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/40';

              return (
                <button
                  key={tag.addr}
                  disabled={disabled}
                  draggable={!disabled}
                  onDragStart={(e) => handleDragStart(e, {
                    kind: 'io',
                    addr: tag.addr,
                    label: tag.label,
                    isOutput: tag.isOutput
                  })}
                  onClick={() => {
                    if (onSelectIoToken && hasSelection) {
                      onSelectIoToken(tag.addr);
                    } else if (onAddInstruction) {
                      onAddInstruction(tag.isOutput ? 'OTE' : 'XIC', tag.addr);
                    }
                  }}
                  className={`border rounded-lg px-2 py-1 text-left flex flex-col justify-center min-w-[76px] cursor-grab active:cursor-grabbing transition shrink-0 group ${theme}`}
                  title={`Drag ${tag.addr} (${tag.label}) to a rung or contact, or click to apply`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] font-bold tracking-tight">{tag.addr}</span>
                    <span className="text-[8px] opacity-50">⠿</span>
                  </div>
                  <span className="text-[9px] truncate max-w-[95px] font-medium leading-tight opacity-85">{tag.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {activeCategory === 'Math' && renderIcons(mathIcons)}
        {activeCategory === 'Compare' && renderIcons(compareIcons)}
        {activeCategory === 'Move / logic' && renderIcons(moveIcons)}
      </div>
    </div>
  );
}
export default InstructionPalette;
