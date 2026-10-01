import React, { useState } from 'react';
import { Activity, Play, Square, RotateCcw, Cpu, GraduationCap, HelpCircle, CheckCircle2, AlertTriangle, Database, Undo2, Redo2, Sun, Moon, Bug, ChevronDown } from 'lucide-react';
import { SAMPLE_PROGRAMS } from '../data/samplePrograms';

export function Header({ isRunning, onToggleRun, onResetMemory, onOpenFullResetModal, onUndo, onRedo, canUndo, canRedo, activeMainTab, onChangeMainTab, onSelectSampleProgram, onOpenHelp, showRunHint, logicIssues, isBitMonitorOpen, onToggleBitMonitor, theme, onToggleTheme }) {
  const [isResetExpanded, setIsResetExpanded] = useState(false);

  return (
    <div className="header-stack">
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
          {isResetExpanded ? (
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-600 rounded-md p-0.5 animate-in fade-in duration-150 shadow-sm">
              <button
                className="ui-button quiet text-xs px-2 py-1 bg-slate-700/80 hover:bg-slate-600 text-slate-200 rounded flex items-center gap-1 transition"
                title="Reset switches, coils, energy, and timers to 0"
                onClick={() => {
                  onResetMemory();
                  setIsResetExpanded(false);
                }}
              >
                <RotateCcw size={13} className="text-cyan-400" />
                <span>Reset run</span>
              </button>
              <button
                className="ui-button quiet text-xs px-2 py-1 bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-500/40 rounded flex items-center gap-1 transition"
                title="Full simulation reset: erase variables, rungs, and PLC tables"
                onClick={() => {
                  setIsResetExpanded(false);
                  onOpenFullResetModal?.();
                }}
              >
                <AlertTriangle size={13} className="text-red-400" />
                <span>Simulation reset</span>
              </button>
              <button
                className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-xs transition"
                title="Cancel"
                onClick={() => setIsResetExpanded(false)}
              >
                ✕
              </button>
            </div>
          ) : (
            <button className="ui-button quiet" title="Reset options" aria-label="Reset options" onClick={() => setIsResetExpanded(true)}>
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          )}
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
