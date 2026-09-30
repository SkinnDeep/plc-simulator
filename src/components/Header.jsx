import React from 'react';
import { Activity, Play, Square, RotateCcw, Cpu, GraduationCap, HelpCircle, CheckCircle2, AlertTriangle, Database, Undo2, Redo2, Sun, Moon } from 'lucide-react';
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
    <div className="header-stack flex flex-col select-none z-50 shrink-0">
      {/* Top Header Row (Brand & Global Nav) */}
      <header className={`app-header bg-[#1e1e1e] border-b border-[#2d2d2d] text-slate-100 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-4 ${isRunning ? 'border-t-4 border-t-emerald-500' : 'border-t-4 border-t-slate-700'}`}>
        {/* Brand & Processor Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center text-cyan-400 shadow-md shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-white">RSLogix Web Sim</h1>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 font-bold">
                PRO
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono hidden xs:block">Industrial Logic Engine</p>
          </div>
        </div>

        {/* Global Controls & Tabs */}
        <div className="header-navigation flex items-center gap-1.5 sm:gap-2 justify-end shrink-0 whitespace-nowrap">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            title="Toggle Dark/Light Mode" aria-label={theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <a
            href="https://github.com/SkinnDeep/plc-simulator/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/50 text-xs font-semibold transition cursor-pointer"
            title="Found a bug? Report it on GitHub!" aria-label="Report a bug on GitHub"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            
          </a>

          <button
            onClick={onOpenHelp}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            title="Open Simulator Tutorial & Guide" aria-label="Open simulator guide"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            
          </button>

          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 sm:p-1 text-xs font-bold ml-1">
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

      {/* Bottom Toolbar Row (Simulator Controls) */}
      <div className="execution-toolbar bg-[#15161a] border-b-2 border-[#2d2d2d] px-3 sm:px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto">
        <div id="tour-controls" role="group" aria-label="Program controls" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <button
              title={isRunning ? 'Stop PLC execution' : 'Run PLC program'} aria-label={isRunning ? 'Stop PLC' : 'Run PLC'} aria-pressed={isRunning} onClick={onToggleRun}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition cursor-pointer ${
                isRunning
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-700'
              }`}
            >
              {isRunning ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'Stop' : 'Run'}</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-700" />

            <button
              title="Reset all lamps, coils, and timers to 0" aria-label="Reset logic" onClick={onResetMemory}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden p-0.5">
            <button
              aria-label="Undo" onClick={onUndo} disabled={!canUndo}
              className={`p-1.5 sm:p-2 rounded transition cursor-pointer ${canUndo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
            <button
              aria-label="Redo" onClick={onRedo} disabled={!canRedo}
              className={`p-1.5 sm:p-2 rounded transition cursor-pointer ${canRedo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
            >
              <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <button
            aria-controls="bit-monitor" aria-expanded={isBitMonitorOpen} onClick={onToggleBitMonitor}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
              isBitMonitorOpen
                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Toggle I/O Bit Data Monitor"
          >
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Bit Monitor</span>
            <span className="opacity-70 text-[10px] ml-0.5">(I/O)</span>
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <select
            aria-label="Load sample program"
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
            className={`group relative hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-help ${
              logicIssues?.length > 0
                ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                : 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
            }`}
          >
            {logicIssues?.length > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Issues ({logicIssues?.length || 0})</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-slate-300 font-sans whitespace-normal text-left font-normal pointer-events-none">
                  <strong className="text-amber-400 block mb-2 font-semibold">Logic Warnings:</strong>
                  <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-300">
                    {logicIssues.map((issue, idx) => (
                      <li key={idx} className="leading-snug">{issue.message}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">No issues found</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-slate-300 font-sans whitespace-nowrap font-normal pointer-events-none">
                  Status: All logic checks passed.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showRunHint && <div role="status" className="run-hint">Press Run to see your logic respond to the inputs.</div>}
    </div>
  );
}
