import React from 'react';
import { Play, Square, RotateCcw, Cpu, GraduationCap, HelpCircle, CheckCircle2, AlertTriangle, Database, Undo2, Redo2 } from 'lucide-react';
import { SAMPLE_PROGRAMS } from '../data/samplePrograms';

export function Header({
  isRunning,
  onToggleRun,
  onResetMemory,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeMainTab,
  onChangeMainTab,
  onSelectSampleProgram,
  onOpenHelp,
  showRunHint,
  hasErrors,
  logicIssues,
  isBitMonitorOpen,
  onToggleBitMonitor,
  theme,
  onToggleTheme
}) {
  return (
    <header className={`app-header bg-[#1e1e1e] border-b-2 text-slate-100 px-3 sm:px-4 py-2 flex flex-nowrap overflow-x-auto items-center justify-between gap-4 shadow-xl select-none ${isRunning ? 'border-t-4 border-t-emerald-500 border-b-[#2d2d2d]' : 'border-t-4 border-t-slate-700 border-b-[#2d2d2d]'}`}>
      {/* Brand & Processor Status */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-gradient-to-br from-red-600 to-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
          BYU
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-white">PLC Simulator</h1>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 font-bold">
              MFGEN 333
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono hidden xs:block">Created by SkinnDeep</p>
        </div>
      </div>

      {/* Primary Actions: RUN/STOP, RESET, PRESETS, BIT MONITOR */}
      <div id="tour-controls" role="group" aria-label="Program controls" className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
        {/* RUN / STOP Button */}
        <button
          id="tour-run"
          onClick={onToggleRun}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : showRunHint 
                ? 'bg-emerald-400 text-slate-950 ring-4 ring-emerald-500/50 animate-pulse scale-105' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
          title={isRunning ? "Stop PLC execution" : "Run PLC program"}
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN</span>
            </>
          )}
        </button>

        {/* Reset Memory */}
        <button
          onClick={onResetMemory}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          title="Reset all lamps, coils, and timers to 0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`px-2 py-1.5 sm:py-2 transition ${canUndo ? 'hover:bg-slate-700 text-slate-200 cursor-pointer' : 'opacity-50 text-slate-500 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-slate-700" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`px-2 py-1.5 sm:py-2 transition ${canRedo ? 'hover:bg-slate-700 text-slate-200 cursor-pointer' : 'opacity-50 text-slate-500 cursor-not-allowed'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bit Monitor Drawer Toggle */}
        <button
          aria-expanded={isBitMonitorOpen} aria-controls="bit-monitor" onClick={onToggleBitMonitor}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs shadow-md transition active:scale-95 cursor-pointer ${
            isBitMonitorOpen
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 ring-2 ring-purple-400'
              : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/50'
          }`}
          title="Toggle Data Table / Live Bit Monitor (1/0 Watch & Debug)"
        >
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Bit Monitor (1/0)</span>
          <span className="sm:hidden">1/0</span>
        </button>

        {/* Quick Presets Dropdown */}
        <select
          aria-label="Load example program"
          onChange={(e) => {
            if (e.target.value) {
              onSelectSampleProgram(e.target.value);
              e.target.value = '';
            }
          }}
          defaultValue=""
          className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-semibold rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:border-cyan-400 cursor-pointer max-w-[140px] sm:max-w-[190px] truncate"
        >
          <option value="" disabled>Load Example...</option>
          {SAMPLE_PROGRAMS.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div 
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-help ${
            logicIssues?.length > 0
              ? 'bg-amber-950/60 border-amber-600 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
          }`}
          title={logicIssues?.length > 0 ? `Logic Warnings:\n${logicIssues.map(i => '- ' + i.message).join('\n')}` : "No issues found"}
        >
          {logicIssues?.length > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Logic Warning ({logicIssues?.length || 0})</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>No issues found</span>
            </>
          )}
        </div>
      </div>

      {/* Right Controls: Help Button & Main Tab Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>

        <a
          href="https://github.com/SkinnDeep/plc-simulator/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/50 text-xs font-semibold transition cursor-pointer"
          title="Found a bug? Report it on GitHub!"
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Report Bug</span>
        </a>

        <button
          onClick={onOpenHelp}
          className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          title="Open Simulator Tutorial & Guide"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Help</span>
        </button>

        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 sm:p-1 text-xs font-bold">
          <button
            aria-pressed={activeMainTab === 'simulator'} onClick={() => onChangeMainTab('simulator')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition cursor-pointer ${
              activeMainTab === 'simulator'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="">Simulator</span>
          </button>

          <button
            aria-pressed={activeMainTab === 'learning'} onClick={() => onChangeMainTab('learning')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition cursor-pointer ${
              activeMainTab === 'learning'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="">Learning</span>
          </button>
        </div>
      </div>
    </header>
  );
}
