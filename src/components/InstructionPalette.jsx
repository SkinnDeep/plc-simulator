import React, { useState } from 'react';
import { Sparkles, Move, GitFork } from 'lucide-react';

export function InstructionPalette({
  onAddInstruction,
  onAddBranch,
  onSelectIoToken,
  hasSelection
}) {
  const [activeCategory, setActiveCategory] = useState('instructions');

  const instructions = [
    { type: 'XIC', symbol: '-[ ]-', name: 'XIC', desc: 'Normally Open Contact (Examine If Closed)', isOutput: false },
    { type: 'XIO', symbol: '-[/]-', name: 'XIO', desc: 'Normally Closed Contact (Examine If Open)', isOutput: false },
    { type: 'OTE', symbol: '-( )-', name: 'OTE', desc: 'Output Energize Coil', isOutput: true },
    { type: 'OTL', symbol: '-(L)-', name: 'OTL', desc: 'Output Latch (Retentive)', isOutput: true },
    { type: 'OTU', symbol: '-(U)-', name: 'OTU', desc: 'Output Unlatch', isOutput: true },
    { type: 'TON', symbol: '[TON]', name: 'TON', desc: 'Timer On Delay', isOutput: true },
    { type: 'RES', symbol: '-(RES)-', name: 'RES', desc: 'Reset Timer', isOutput: true },
    { type: 'BRANCH', symbol: '──╵─+─╷──', name: 'Branch Wire', desc: 'Parallel Branch (OR Logic)', isBranch: true }
  ];

  const mathInstructions = [
    { type: 'ADD', symbol: '[ADD]', name: 'ADD', desc: 'Add: Dest = Source A + Source B', isOutput: true, isBlock: true },
    { type: 'SUB', symbol: '[SUB]', name: 'SUB', desc: 'Subtract: Dest = Source A - Source B', isOutput: true, isBlock: true },
    { type: 'MUL', symbol: '[MUL]', name: 'MUL', desc: 'Multiply: Dest = Source A * Source B', isOutput: true, isBlock: true },
    { type: 'DIV', symbol: '[DIV]', name: 'DIV', desc: 'Divide: Dest = Source A / Source B', isOutput: true, isBlock: true },
    { type: 'MOV', symbol: '[MOV]', name: 'MOV', desc: 'Move Register Value to Dest', isOutput: true, isBlock: true },
    { type: 'EQU', symbol: '[EQU]', name: 'EQU', desc: 'Equal: Compare Source A == Source B', isOutput: false, isBlock: true }
  ];

  const inputs = [
    { addr: 'I:0/0', label: 'Switch 1 (I:0/0)', desc: 'Toggle Switch 1', color: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' },
    { addr: 'I:0/1', label: 'Switch 2 (I:0/1)', desc: 'Toggle Switch 2', color: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' },
    { addr: 'I:0/2', label: 'Green PB (I:0/2)', desc: 'Start Pushbutton 1', color: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' },
    { addr: 'I:0/3', label: 'Red PB (I:0/3)', desc: 'Stop Pushbutton 2', color: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' }
  ];

  const outputs = [
    { addr: 'O:0/0', label: 'Amber Lamp (O:0/0)', desc: 'Pilot Lamp 1', color: 'border-amber-600/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60' },
    { addr: 'O:0/1', label: 'Blue Lamp (O:0/1)', desc: 'Pilot Lamp 2', color: 'border-cyan-600/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60' },
    { addr: 'O:0/2', label: 'Green Lamp (O:0/2)', desc: 'Pilot Lamp 3', color: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' },
    { addr: 'O:0/3', label: 'Red Lamp (O:0/3)', desc: 'Pilot Lamp 4', color: 'border-red-600/50 bg-red-950/40 text-red-300 hover:bg-red-900/60' }
  ];

  const binary = [
    { addr: 'B3:0/0', label: 'B3:0/0', desc: 'Internal Relay Flag 0', color: 'border-blue-600/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60' },
    { addr: 'B3:0/1', label: 'B3:0/1', desc: 'Internal Relay Flag 1', color: 'border-blue-600/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60' },
    { addr: 'B3:0/2', label: 'B3:0/2', desc: 'Internal Relay Flag 2', color: 'border-blue-600/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60' },
    { addr: 'B3:0/3', label: 'B3:0/3', desc: 'Internal Relay Flag 3', color: 'border-blue-600/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60' }
  ];

  const timers = [
    { addr: 'T4:0.DN', label: 'T4:0.DN', desc: 'Timer 0 Done Bit', color: 'border-purple-600/50 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60' },
    { addr: 'T4:0.TT', label: 'T4:0.TT', desc: 'Timer 0 Timing Bit', color: 'border-purple-600/50 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60' },
    { addr: 'T4:0.EN', label: 'T4:0.EN', desc: 'Timer 0 Enable Bit', color: 'border-purple-600/50 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60' },
    { addr: 'N7:0', label: 'N7:0 (Reg)', desc: 'Integer Register 0', color: 'border-indigo-600/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60' },
    { addr: 'N7:1', label: 'N7:1 (Reg)', desc: 'Integer Register 1', color: 'border-indigo-600/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60' },
    { addr: 'N7:2', label: 'N7:2 (Reg)', desc: 'Integer Register 2', color: 'border-indigo-600/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60' }
  ];

  const handleDragStart = (e, dragData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div id="tour-palette" className="bg-slate-950/90 border-b border-slate-800 p-2.5 flex flex-col gap-2 select-none shadow-sm">
      {/* Category Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'instructions', label: 'Bit Instructions' },
            { id: 'math', label: 'Math & Compute' },
            { id: 'inputs', label: 'Inputs (I:0)' },
            { id: 'outputs', label: 'Outputs (O:0)' },
            { id: 'binary', label: 'Internal Relay (B3)' },
            { id: 'timers', label: 'Timers & Registers' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Click to add or drag to drop</span>
        </div>
      </div>

      {/* Item Strip */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-1 min-h-[38px]">
        {/* 1. Bit Instructions */}
        {activeCategory === 'instructions' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {instructions.map(inst => (
              <button
                key={inst.type}
                id={inst.isBranch ? 'tour-branch-tool' : undefined}
                draggable
                onDragStart={(e) => handleDragStart(e, { kind: 'instruction', type: inst.type, isOutput: inst.isOutput, isBranch: inst.isBranch })}
                onClick={() => inst.isBranch ? onAddBranch() : onAddInstruction(inst.type)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs cursor-pointer shadow-sm transition active:scale-95 group ${
                  inst.isBranch
                    ? 'bg-indigo-950/60 hover:bg-indigo-900/80 border-indigo-500/60 text-indigo-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 hover:border-cyan-400 text-slate-200'
                }`}
                title={`${inst.desc} — Click to add or drag onto rung`}
              >
                <span className="font-extrabold text-cyan-400 group-hover:scale-105 transition-transform">{inst.symbol}</span>
                <span className="text-xs font-sans font-semibold text-slate-300">{inst.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* 2. Math & Compute Instructions */}
        {activeCategory === 'math' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {mathInstructions.map(inst => (
              <button
                key={inst.type}
                draggable
                onDragStart={(e) => handleDragStart(e, { kind: 'instruction', type: inst.type, isOutput: inst.isOutput, isBlock: true })}
                onClick={() => onAddInstruction(inst.type)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-700/70 bg-indigo-950/40 hover:bg-indigo-900/60 text-slate-200 font-mono text-xs cursor-pointer shadow-sm transition active:scale-95 group"
                title={`${inst.desc} — Click to add or drag onto rung`}
              >
                <span className="font-extrabold text-indigo-400 group-hover:scale-105 transition-transform">{inst.symbol}</span>
                <span className="text-xs font-sans font-semibold text-slate-300">{inst.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* 2. Inputs */}
        {activeCategory === 'inputs' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {inputs.map(inp => (
              <button
                key={inp.addr}
                draggable
                onDragStart={(e) => handleDragStart(e, { kind: 'io', addr: inp.addr, isOutput: false })}
                onClick={() => onSelectIoToken(inp.addr, false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer shadow-sm transition active:scale-95 ${inp.color}`}
                title={`${inp.desc} — Click to assign or add contact`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
                <span>{inp.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 3. Outputs */}
        {activeCategory === 'outputs' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {outputs.map(out => (
              <button
                key={out.addr}
                draggable
                onDragStart={(e) => handleDragStart(e, { kind: 'io', addr: out.addr, isOutput: true })}
                onClick={() => onSelectIoToken(out.addr, true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer shadow-sm transition active:scale-95 ${out.color}`}
                title={`${out.desc} — Click to assign or add coil`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                <span>{out.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 4. Binary B3 */}
        {activeCategory === 'binary' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {binary.map(b => (
              <button
                key={b.addr}
                draggable
                onDragStart={(e) => handleDragStart(e, { kind: 'io', addr: b.addr, isOutput: false })}
                onClick={() => onSelectIoToken(b.addr, false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer shadow-sm transition active:scale-95 ${b.color}`}
                title={`${b.desc} — Click to assign internal relay`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400/80" />
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 5. Timers & Memory */}
        {activeCategory === 'timers' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {timers.map(t => (
              <button
                key={t.addr}
                draggable
                onDragStart={(e) => handleDragStart(e, { kind: 'io', addr: t.addr, isOutput: false })}
                onClick={() => onSelectIoToken(t.addr, false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer shadow-sm transition active:scale-95 ${t.color}`}
                title={`${t.desc} — Click to assign timer bit`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400/80" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default InstructionPalette;
