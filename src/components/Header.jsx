import React, { useState } from 'react';
import { Activity, Play, Square, RotateCcw, Cpu, GraduationCap, HelpCircle, CheckCircle2, AlertTriangle, Database, Undo2, Redo2, Sun, Moon, Bug, ChevronDown, Trash2 } from 'lucide-react';
import { SAMPLE_PROGRAMS } from '../data/samplePrograms';

export function Header({ isRunning, onToggleRun, onResetMemory, onOpenFullResetModal, onUndo, onRedo, canUndo, canRedo, activeMainTab, onChangeMainTab, onSelectSampleProgram, onOpenHelp, showRunHint, logicIssues, isBitMonitorOpen, onToggleBitMonitor, theme, onToggleTheme }) {
  const [isResetMenuOpen, setIsResetMenuOpen] = useState(false);

  return (
    <div className="header-stack relative z-50">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark"><Activity size={22} strokeWidth={1.7} /></span>
          <h1>RSLogix <span>Simulator</span></h1>
          <span className="version-tag">500</span>
        </div>
        <div className="header-navigation">
          <div className="header-utilities">
            <button className="icon-button" onClick={onToggleTheme} title="Toggle Dark/Light Mode" aria-label={theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <a className="icon-button" href="https://github.com/SkinnDeep/plc-simulator/issues" target="_blank" rel="noopener noreferrer" title="Report a bug" aria-label="Report a bug on GitHub"><Bug size={17} /></a>
            <button className="icon-button" onClick={onOpenHelp} title="Open Simulator Tutorial & Guide" aria-label="Open simulator guide"><HelpCircle size={17} /></button>
          </div>
          <nav className="main-tabs" aria-label="Workspace">
            <button aria-pressed={activeMainTab === 'simulator'} onClick={() => onChangeMainTab('simulator')}><Cpu size={16} />Simulator</button>
            <button aria-pressed={activeMainTab === 'learning'} onClick={() => onChangeMainTab('learning')}><GraduationCap size={17} />Learning</button>
          </nav>
        </div>
      </header>
      <div className="execution-toolbar">
        <div id="tour-controls" role="group" aria-label="Program controls">
          <button className={`ui-button run-button ${isRunning ? 'is-running' : ''}`} title={isRunning ? 'Stop PLC execution' : 'Run PLC program'} aria-label={isRunning ? 'Stop PLC' : 'Run PLC'} aria-pressed={isRunning} onClick={onToggleRun}>
            {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={15} fill="currentColor" />}<span>{isRunning ? 'Stop' : 'Run'}</span>
          </button>
          {/* Obvious 2-Option Reset Controls */}
          <div className="relative inline-flex items-center rounded-md bg-slate-800/80 border border-slate-700 hover:border-slate-600 shadow-sm transition">
            <button
              className="ui-button quiet px-2.5 py-1 text-xs flex items-center gap-1.5 hover:text-white transition cursor-pointer"
              title="Quick Reset: resets switches, coils, and timers to 0. Keeps all ladder logic and variable tags."
              aria-label="Reset run state"
              onClick={() => onResetMemory()}
            >
              <RotateCcw size={13} className="text-cyan-400" />
              <span>Reset</span>
            </button>
            <span className="w-[1px] h-4 bg-slate-700" />
            <button
              className={`ui-button quiet px-1.5 py-1 text-xs hover:text-white transition cursor-pointer ${isResetMenuOpen ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              title="Choose reset mode (Reset Run vs Full Simulation Reset)"
              aria-label="Choose reset mode"
              aria-expanded={isResetMenuOpen}
              onClick={() => setIsResetMenuOpen(!isResetMenuOpen)}
            >
              <ChevronDown size={12} className={`transition-transform duration-150 ${isResetMenuOpen ? 'rotate-180 text-cyan-300' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isResetMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent cursor-default" 
                  onClick={() => setIsResetMenuOpen(false)} 
                />
                <div className="absolute top-full left-0 mt-1.5 z-50 w-72 p-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-slate-200">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                    <span>Reset Options</span>
                    <span className="text-[9px] text-slate-500 font-mono">2 modes</span>
                  </div>

                  {/* Mode 1: Reset Run State */}
                  <button
                    onClick={() => {
                      setIsResetMenuOpen(false);
                      onResetMemory();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-md bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 group-hover:scale-105 transition-transform mt-0.5 shrink-0">
                      <RotateCcw size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300">1. Reset Run State</span>
                        <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-1 rounded">Quick</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Clears switches, coils, &amp; timers to 0. Keeps all ladder rungs &amp; custom names intact.
                      </p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-800/80" />

                  {/* Mode 2: Full Simulation Reset */}
                  <button
                    onClick={() => {
                      setIsResetMenuOpen(false);
                      onOpenFullResetModal?.();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 group-hover:text-amber-300 group-hover:border-amber-500/40 group-hover:bg-amber-950/30 group-hover:scale-105 transition-all mt-0.5 shrink-0">
                      <Trash2 size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300">2. Full Simulation Reset...</span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-1 rounded">Wipe</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Erases ladder rungs, resets data tables, and reverts custom variable names to defaults.
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <span className="toolbar-divider" />
          <button className="icon-button" aria-label="Undo" title="Undo" onClick={onUndo} disabled={!canUndo}><Undo2 size={16} /></button>
          <button className="icon-button" aria-label="Redo" title="Redo" onClick={onRedo} disabled={!canRedo}><Redo2 size={16} /></button>
          <span className="toolbar-divider" />
          <button className="ui-button quiet monitor-button" aria-label="Bit monitor" aria-controls="bit-monitor" aria-expanded={isBitMonitorOpen} onClick={onToggleBitMonitor} title="Toggle I/O Bit Data Monitor"><Database size={15} /><span>Bit monitor</span></button>
        </div>
        <div className="execution-secondary">
          <div className="example-select">
            <select aria-label="Load sample program" defaultValue="" onChange={e => { if (e.target.value) { onSelectSampleProgram(e.target.value); e.target.value = ''; } }}>
              <option value="" disabled>Load example</option>
              {SAMPLE_PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
          <span className={`program-health ${logicIssues?.length ? 'has-issues' : ''}`} title={logicIssues?.length ? logicIssues.map(issue => issue.message).join('\n') : 'All logic checks passed'}>
            {logicIssues?.length ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {logicIssues?.length ? `${logicIssues.length} issues` : 'All checks passed'}
          </span>
        </div>
      </div>
      {showRunHint && <div role="status" className="run-hint">Press Run to see your logic respond to the inputs.</div>}
    </div>
  );
}
