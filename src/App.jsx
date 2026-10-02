import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseProgramFile } from './engine/programFile';
import { PLCEngine } from './engine/plcEngine';
import { createInitialDataModel } from './types/plcTypes';
import { SAMPLE_PROGRAMS } from './data/samplePrograms';
import { Header } from './components/Header';
import { HardwareTrainer } from './components/HardwareTrainer';
import { MetalShearSandbox } from './components/MetalShearSandbox';
import { LadderEditor } from './components/LadderEditor';
import { LearningTab } from './components/LearningTab';
import { SpotlightTour } from './components/SpotlightTour';
import { BitMonitorDrawer } from './components/BitMonitorDrawer';
import { validateLadderLogic } from './engine/plcValidator';
import { Check, AlertTriangle, Workflow, SlidersHorizontal, Download, Trash2, RotateCcw, X } from 'lucide-react';

const INITIAL_BLANK_RUNGS = [
  {
    id: 'r0',
    comment: 'Rung 000: Control logic (drag instructions and I/O to begin)',
    items: []
  }
];

export const DEFAULT_PLC1_SYMBOLS = {
  'I:0/0': 'Switch 1',
  'I:0/1': 'Switch 2',
  'I:0/2': 'Green PB',
  'I:0/3': 'Red PB',
  'O:0/0': 'Amber Lamp 1',
  'O:0/1': 'Blue Lamp 2',
  'O:0/2': 'Green Lamp 3',
  'O:0/3': 'Red Lamp 4',
  'T4:0': 'Timer 0',
  'N7:0': 'Int 0'
};

export const DEFAULT_SHEAR_SYMBOLS = {
  'I:0/0': 'START_PB',
  'I:0/1': 'STOP_PB',
  'I:0/2': 'PROX',
  'I:0/3': 'DOWN_LS',
  'I:0/4': 'UP_LS',
  'O:0/0': 'CONV1',
  'O:0/1': 'CONV2',
  'O:0/2': 'SHEAR',
  'O:0/3': 'CONV3',
  'B3:0/0': 'RUN_RELAY',
  'T4:0': 'Timer 0',
  'N7:0': 'Int 0'
};

export function App() {
  const [activeSandbox, setActiveSandbox] = useState('HardwareTrainer');
  const [plcData, setPlcData] = useState(() => createInitialDataModel());
  const [isRunning, setIsRunning] = useState(false);
  const [symbolsMap, setSymbolsMap] = useState(() => {
    try {
      const saved = localStorage.getItem('plcSymbolsBySandbox');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    let legacySymbols = null;
    try {
      const legacy = localStorage.getItem('plcSymbols');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && typeof parsed === 'object') legacySymbols = parsed;
      }
    } catch {}
    return {
      HardwareTrainer: legacySymbols || { ...DEFAULT_PLC1_SYMBOLS },
      MetalShear: { ...DEFAULT_SHEAR_SYMBOLS }
    };
  });

  const activeSymbols = useMemo(() => {
    const defaults = activeSandbox === 'MetalShear' ? DEFAULT_SHEAR_SYMBOLS : DEFAULT_PLC1_SYMBOLS;
    const current = symbolsMap[activeSandbox] || {};
    return { ...defaults, ...current };
  }, [symbolsMap, activeSandbox]);

  const handleUpdateSymbol = (addr, label) => {
    setSymbolsMap(prev => {
      const current = prev[activeSandbox] || (activeSandbox === 'MetalShear' ? DEFAULT_SHEAR_SYMBOLS : DEFAULT_PLC1_SYMBOLS);
      const next = {
        ...prev,
        [activeSandbox]: { ...current, [addr]: label }
      };
      try { localStorage.setItem('plcSymbolsBySandbox', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [isFullResetModalOpen, setIsFullResetModalOpen] = useState(false);

  const handleExportProgram = () => {
    const exportPayload = {
      version: 'RSLogix-500-Sim-v2',
      timestamp: new Date().toISOString(),
      sandbox: activeSandbox,
      symbols: activeSymbols,
      rungs: currentRungs
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSandbox.toLowerCase()}_ladder_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner("Program & symbols exported to JSON successfully.");
  };

  const handleConfirmFullReset = () => {
    setSymbolsMap(prev => {
      const next = { ...prev };
      delete next[activeSandbox];
      try {
        localStorage.setItem('plcSymbolsBySandbox', JSON.stringify(next));
        localStorage.removeItem('plcSymbols');
      } catch (err) {
        console.error(err);
      }
      return next;
    });

    const defaultRung = [{
      id: 'rung-0',
      comment: 'Rung 000: Control logic',
      items: []
    }];
    setCurrentRungs(defaultRung);
    setHistory([defaultRung]);
    setHistoryIndex(0);

    setIsRunning(false);
    setPlcData(createInitialDataModel());
    setIsFullResetModalOpen(false);
    showBanner("Simulation fully reset: logic, memory, and custom variable names wiped.");
  };

  // History stack for Undo/Redo
  const [history, setHistory] = useState(() => {
    try {
      const savedRungs = localStorage.getItem('plcRungs');
      if (savedRungs) {
        const parsed = parseProgramFile(savedRungs);
        if (Array.isArray(parsed) && parsed.length > 0) return [parsed];
      }
    } catch {}
    return [INITIAL_BLANK_RUNGS];
  });
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const currentRungs = history[historyIndex];

  // Save rungs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('plcRungs', JSON.stringify(currentRungs));
    } catch {}
  }, [currentRungs]);

  // Collect custom variable names modified in the current active program/panel
  const customVariablesList = useMemo(() => {
    const defaults = activeSandbox === 'MetalShear' ? DEFAULT_SHEAR_SYMBOLS : DEFAULT_PLC1_SYMBOLS;
    const current = symbolsMap[activeSandbox] || {};

    // Collect addresses actively referenced in current rungs
    const activeRungAddresses = new Set();
    const scanItems = (items) => {
      if (!Array.isArray(items)) return;
      items.forEach(item => {
        if (!item) return;
        if (item.type === 'BRANCH' && Array.isArray(item.branches)) {
          item.branches.forEach(b => scanItems(b));
          return;
        }
        if (item.operand) {
          activeRungAddresses.add(item.operand);
          const base = item.operand.split('.')[0];
          if (base) activeRungAddresses.add(base);
        }
        if (item.params) {
          ['source', 'sourceA', 'sourceB', 'dest', 'test', 'lowLim', 'highLim'].forEach(k => {
            const v = item.params[k];
            if (typeof v === 'string' && /^[A-Z0-9_:\/\.]+$/i.test(v)) {
              activeRungAddresses.add(v);
              const base = v.split('.')[0];
              if (base) activeRungAddresses.add(base);
            }
          });
        }
      });
    };
    (currentRungs || []).forEach(r => scanItems(r.items));

    // Also include physical panel I/O (switches and pilot lights)
    const panelIO = activeSandbox === 'MetalShear'
      ? ['I:0/0', 'I:0/1', 'I:0/2', 'I:0/3', 'I:0/4', 'O:0/0', 'O:0/1', 'O:0/2', 'O:0/3']
      : ['I:0/0', 'I:0/1', 'I:0/2', 'I:0/3', 'O:0/0', 'O:0/1', 'O:0/2', 'O:0/3'];

    const relevantAddresses = new Set([...activeRungAddresses, ...panelIO]);

    const list = [];
    Object.keys(current).forEach(addr => {
      // ONLY include if it's relevant to the current active project and changed from default!
      if (relevantAddresses.has(addr) && current[addr] && current[addr] !== defaults[addr]) {
        list.push({ addr, name: current[addr], original: defaults[addr] || '(default)' });
      }
    });
    return list;
  }, [symbolsMap, activeSandbox, currentRungs]);

  const setCurrentRungs = (newRungs) => {
    const resolvedRungs = typeof newRungs === 'function' ? newRungs(currentRungs) : newRungs;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(resolvedRungs);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setHasAttemptedRun(false);
  };

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
    setHasAttemptedRun(false);
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
    setHasAttemptedRun(false);
  };

  const [scanResult, setScanResult] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('simulator'); // 'simulator' | 'learning'
  const [mobileView, setMobileView] = useState('ladder'); // 'bench' | 'ladder' on mobile
  const [loadNotice, setLoadNotice] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isBitMonitorOpen, setIsBitMonitorOpen] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('theme', next); } catch { /* Storage is optional. */ }
  };



  const engineRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = new PLCEngine(createInitialDataModel());
  }

  const engine = engineRef.current;

  const [hasAttemptedRun, setHasAttemptedRun] = useState(false);

  // Real-time ladder logic error validation
  const logicIssues = useMemo(() => validateLadderLogic(currentRungs, hasAttemptedRun), [currentRungs, hasAttemptedRun]);
  const hasErrors = logicIssues.some(i => i.severity === 'error');

  // Check first-time tutorial
  useEffect(() => {
    let hasSeen = true;
    try { hasSeen = localStorage.getItem('hasSeenPlcTutorial'); } catch { /* Storage is optional. */ }
    if (!hasSeen) {
      setIsHelpOpen(true);
      try { localStorage.setItem('hasSeenPlcTutorial', 'true'); } catch { /* Storage is optional. */ }
    }
  }, []);

  // Synchronize rungs with engine
  useEffect(() => {
    engine.currentRungs = currentRungs;
    setScanResult(null);
  }, [currentRungs, engine]);

  // Subscribe to scan ticks
  useEffect(() => {
    const unsubscribe = engine.subscribe((data, result) => {
      setPlcData({
        bits: { ...data.bits },
        T4: data.T4.map(t => ({ ...t })),
        N7: [...data.N7],
        S2: { ...data.S2 }
      });
      setScanResult(result);
    });

    if (isRunning) {
      engine.start();
    } else {
      engine.stop();
    }

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine, isRunning]);

  const noticeTimer = useRef(null);
  const hintTimer = useRef(null);
  useEffect(() => () => {
    clearTimeout(noticeTimer.current);
    clearTimeout(hintTimer.current);
  }, []);

  const showBanner = (msg) => {
    clearTimeout(noticeTimer.current);
    setLoadNotice(msg);
    noticeTimer.current = setTimeout(() => setLoadNotice(null), 3000);
  };

  const handleResetMemory = () => {
    setLoadNotice(null);
    setShowRunHint(false);
    engine.stop();
    setIsRunning(false);
    const fresh = createInitialDataModel();
    engine.data = fresh;
    if (engine.latchedOutputs) engine.latchedOutputs.clear();
    setPlcData(fresh);
    engine.lastScanTime = performance.now();
    setScanResult(null);
  };

  const handleExplicitResetRun = () => {
    handleResetMemory();
    showBanner("Run state reset: switches, coils, and timers set to 0. Ladder logic preserved.");
  };

  const handleToggleRun = () => {
    setShowRunHint(false);
    if (isRunning) {
      handleResetMemory();
    } else {
      setHasAttemptedRun(true);
      const allIssues = validateLadderLogic(currentRungs, true);
      if (allIssues.some(i => i.severity === 'error')) {
        return;
      }
      engine.start();
      setIsRunning(true);
    }
  };

  const [showRunHint, setShowRunHint] = useState(false);

  const triggerRunHint = () => {
    clearTimeout(hintTimer.current);
    setShowRunHint(true);
    hintTimer.current = setTimeout(() => setShowRunHint(false), 2000);
  };

  const handleToggleInput = (address, val) => {
    engine.setBit(address, val);
    
    const hasBlocks = currentRungs.some(rung => rung.items && rung.items.length > 0);
    if (!isRunning && hasBlocks) {
      triggerRunHint();
    }

    const res = engine.isRunning ? engine.executeScanCycle(currentRungs) : null;
    setPlcData({
      bits: { ...engine.data.bits },
      T4: engine.data.T4.map(t => ({ ...t })),
      N7: [...engine.data.N7],
      S2: { ...engine.data.S2 }
    });
    setScanResult(res);
  };

  const handleSetRegister = (addr, val) => {
    engine.setValue(addr, val);
    setPlcData({
      bits: { ...engine.data.bits },
      T4: engine.data.T4.map(t => ({ ...t })),
      N7: [...engine.data.N7],
      S2: { ...engine.data.S2 }
    });
  };

  // 1-Click Load Example Program into Simulator
  const handleSelectSampleProgram = (programId) => {
    const prog = SAMPLE_PROGRAMS.find(p => p.id === programId);
    if (prog) {
      const clonedRungs = JSON.parse(JSON.stringify(prog.rungs));
      setCurrentRungs(clonedRungs);
      handleResetMemory();
      setIsRunning(true);
      engine.start();

      if (activeMainTab === 'learning') {
        setActiveMainTab('simulator');
      }

      showBanner(`Loaded "${prog.name}" — simulation running.`);
    }
  };

  // 1-Click Load Challenge Solution into Simulator
  const handleApplyChallengeSolution = (rungs) => {
    const clonedRungs = JSON.parse(JSON.stringify(rungs));
    setCurrentRungs(clonedRungs);
    handleResetMemory();
    setIsRunning(true);
    engine.start();

    if (activeMainTab === 'learning') {
      setActiveMainTab('simulator');
    }

    showBanner("Challenge logic loaded — simulation running.");
  };

  return (
    <div className={`app-shell flex flex-col fixed inset-0 bg-slate-950 bg-grid-pattern text-slate-100 overflow-hidden font-sans ${theme === 'light' ? 'light-mode' : ''}`}>
      {/* 1. Header Toolbar */}
      <Header
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
        onResetMemory={handleExplicitResetRun}
        onOpenFullResetModal={() => setIsFullResetModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={!isRunning && historyIndex > 0}
        canRedo={!isRunning && historyIndex < history.length - 1}
        activeMainTab={activeMainTab}
        onChangeMainTab={setActiveMainTab}
        onSelectSampleProgram={handleSelectSampleProgram}
        onOpenHelp={() => setIsHelpOpen(true)}
        showRunHint={showRunHint && !isRunning}
        hasErrors={hasErrors}
        logicIssues={logicIssues}
        isBitMonitorOpen={isBitMonitorOpen}
        onToggleBitMonitor={() => setIsBitMonitorOpen(v => !v)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Program Loaded Notification Banner */}
      {loadNotice && (
        <div role="status" className="load-notice">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{loadNotice}</span>
        </div>
      )}

      {/* 2. Main View Area */}
      <div className="workspace-main flex-1 flex flex-col overflow-hidden min-h-0">
        {activeMainTab === 'simulator' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Mobile Sub-View Segmented Switch (visible on screens < lg) */}
            <div className="mobile-view-switch flex lg:hidden bg-slate-900 border border-slate-800 rounded-xl p-1 mb-2 font-bold text-xs shrink-0 shadow-sm">
              <button
                aria-pressed={mobileView === 'ladder'} onClick={() => setMobileView('ladder')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mobileView === 'ladder'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Workflow size={15} /><span>Ladder logic</span>
              </button>
              <button
                aria-pressed={mobileView === 'bench'} onClick={() => setMobileView('bench')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mobileView === 'bench'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal size={15} /><span>Hardware bench</span>
              </button>
            </div>

            {/* Desktop side-by-side or Mobile toggled views */}
            <div className="workspace-columns flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
              {/* Left: Hardware Trainer */}
              <div className={`bench-column w-full lg:w-[380px] shrink-0 flex-col overflow-y-auto min-h-0 pr-1 ${
                mobileView === 'bench' ? 'flex flex-1' : 'hidden lg:flex'
              }`}>
                                <div className="bench-switch flex bg-slate-900 border border-slate-700 rounded-lg p-1 mb-2">
                  <button
                    aria-pressed={activeSandbox === 'HardwareTrainer'} onClick={() => setActiveSandbox('HardwareTrainer')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${activeSandbox === 'HardwareTrainer' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Lights & switches
                  </button>
                  <button
                    aria-pressed={activeSandbox === 'MetalShear'} onClick={() => setActiveSandbox('MetalShear')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${activeSandbox === 'MetalShear' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Metal shear
                  </button>
                </div>
                {activeSandbox === 'HardwareTrainer' ? (
                  <HardwareTrainer
                    plcData={plcData}
                    onToggleInput={handleToggleInput}
                    isRunning={isRunning}
                    theme={theme}
                    symbols={activeSymbols}
                  />
                ) : (
                  <MetalShearSandbox
                    plcData={plcData}
                    onToggleInput={handleToggleInput}
                    isRunning={isRunning}
                    theme={theme}
                    symbols={activeSymbols}
                  />
                )}
              </div>

              {/* Right: Ladder Editor */}
              <div className={`flex-1 flex-col overflow-hidden min-w-0 min-h-0 ${
                mobileView === 'ladder' ? 'flex' : 'hidden lg:flex'
              }`}>
                <LadderEditor
                  activeSandbox={activeSandbox}
                  rungs={currentRungs}
                  onChangeRungs={setCurrentRungs}
                  scanResult={scanResult}
                  plcData={plcData}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  isRunning={isRunning}
                  onStop={handleToggleRun}
                  logicIssues={logicIssues}
                  symbols={activeSymbols}
                  onUpdateSymbol={handleUpdateSymbol}
                />
              </div>
            </div>
          </div>
        )}

        {activeMainTab === 'learning' && (
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <LearningTab
              onLoadProgram={handleSelectSampleProgram}
              onApplyChallengeSolution={handleApplyChallengeSolution}
            />
          </div>
        )}
      </div>

      {/* 3. Live Bit Monitor / Data Table Drawer */}
      <BitMonitorDrawer
        isOpen={isBitMonitorOpen}
        onClose={() => setIsBitMonitorOpen(false)}
        activeSandbox={activeSandbox}
        plcData={plcData}
        onToggleInput={handleToggleInput}
        onSetRegister={handleSetRegister}
        symbols={activeSymbols}
        onUpdateSymbol={handleUpdateSymbol}
      />

      {/* Logic Warnings Console Banner (Bottom) */}
      {logicIssues.length > 0 && (
        <div className="bg-amber-950/80 border-t border-amber-500/50 text-amber-200 px-4 py-2 text-xs font-mono max-h-32 overflow-y-auto shrink-0 shadow-[0_-5px_15px_rgba(245,158,11,0.1)]">
          <div className="font-bold flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Program checks ({logicIssues.length})</span>
          </div>
          <ul className="list-disc pl-8 space-y-0.5">
            {logicIssues.map((issue, idx) => (
              <li key={idx} className="text-amber-300/80">{issue.message} <span className="text-amber-100">{issue.fix}</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Simulation Reset Confirmation Modal */}
      {isFullResetModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 text-slate-100 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Full Simulation Reset</h3>
                <p className="text-xs text-slate-400">
                  Environment: <strong className="text-slate-300">{activeSandbox === 'MetalShear' ? 'Metal Shear Station' : 'Hardware Trainer'}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsFullResetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will completely wipe your current workspace, clearing all ladder rungs, resetting all PLC data tables &amp; switches to 0, and reverting your custom variable names to defaults.
            </p>

            {/* Summary of what will be reset */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Items to be cleared:</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                  Full Wipe
                </span>
              </div>
              <ul className="space-y-1.5 pl-1 text-slate-300 font-mono text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span><strong>{currentRungs.length}</strong> Ladder Logic rung(s) &rarr; reset to 1 blank starter rung</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>PLC Memory (Timers, Coils, Registers, Relays, Switches) &rarr; set to 0</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1" />
                  <div className="flex-1">
                    <span><strong>{customVariablesList.length}</strong> Custom Variable Name(s):</span>
                    {customVariablesList.length > 0 ? (
                      <div className="max-h-24 overflow-y-auto mt-1 space-y-1 pr-1">
                        {customVariablesList.map(v => (
                          <div key={v.addr} className="text-[10px] text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center justify-between">
                            <span className="font-bold font-mono">{v.addr}:</span>
                            <span className="text-slate-200">&quot;{v.name}&quot;</span>
                            <span className="text-slate-400 font-mono text-[9px]">&rarr; &quot;{v.original}&quot;</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic mt-0.5">No custom names modified in current project</div>
                    )}
                  </div>
                </li>
              </ul>
            </div>

            {/* Export First reminder */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300 text-[11px]">Want to save a copy before wiping?</span>
              <button
                type="button"
                onClick={handleExportProgram}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Backup</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFullResetModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullResetModalOpen(false);
                  handleExplicitResetRun();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition cursor-pointer flex items-center gap-1.5"
                title="Only reset switches, energized coils, and timers; keeps your rungs and tags intact"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>Just Reset Run (Keep Code)</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmFullReset}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Full Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive Tutorial & Help Modal */}
      <SpotlightTour
        isActive={isHelpOpen}
        onComplete={() => setIsHelpOpen(false)}
        rungs={currentRungs}
        isRunning={isRunning}
        plcData={plcData}
      />
    </div>
  );
}
export default App;


