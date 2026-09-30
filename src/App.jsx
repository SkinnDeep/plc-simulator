import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Check, AlertTriangle } from 'lucide-react';

const INITIAL_BLANK_RUNGS = [
  {
    id: 'r0',
    comment: 'Rung 000: Control logic (drag instructions and I/O to begin)',
    items: []
  }
];

export function App() {
  const [activeSandbox, setActiveSandbox] = useState('HardwareTrainer');
  const [plcData, setPlcData] = useState(() => createInitialDataModel());
  const [isRunning, setIsRunning] = useState(false);
  const [symbols, setSymbols] = useState(() => {
    try {
      const saved = localStorage.getItem('plcSymbols');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
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
  });
  
  const handleUpdateSymbol = (addr, label) => {
    setSymbols(prev => {
      const next = { ...prev, [addr]: label };
      try { localStorage.setItem('plcSymbols', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // History stack for Undo/Redo
  const [history, setHistory] = useState(() => {
    try {
      const savedRungs = localStorage.getItem('plcRungs');
      if (savedRungs) {
        const parsed = JSON.parse(savedRungs);
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
  const logicIssues = validateLadderLogic(currentRungs, hasAttemptedRun);
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

  const showBanner = (msg) => {
    setLoadNotice(msg);
    setTimeout(() => setLoadNotice(null), 3000);
  };

  const handleResetMemory = () => {
    engine.stop();
    setIsRunning(false);
    const fresh = createInitialDataModel();
    engine.data = fresh;
    if (engine.latchedOutputs) engine.latchedOutputs.clear();
    setPlcData(fresh);
    engine.lastScanTime = performance.now();
    setScanResult(null);
  };

  const handleToggleRun = () => {
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
    setShowRunHint(true);
    setTimeout(() => setShowRunHint(false), 2000);
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

      showBanner(`Loaded "${prog.name}" into Simulator - Ready to Run!`);
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

    showBanner("Loaded Challenge Logic into Simulator - Ready to Run!");
  };

  return (
    <div className={`app-shell flex flex-col h-screen w-full bg-slate-950 bg-grid-pattern text-slate-100 overflow-hidden font-sans ${theme === 'light' ? 'light-mode' : ''}`}>
      {/* 1. Header Toolbar */}
      <Header
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
        onResetMemory={handleResetMemory}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={!isRunning && historyIndex > 0}
        canRedo={!isRunning && historyIndex < history.length - 1}
        activeMainTab={activeMainTab}
        onChangeMainTab={setActiveMainTab}
        onSelectSampleProgram={handleSelectSampleProgram}
        onOpenHelp={() => setIsHelpOpen(true)}
        showRunHint={showRunHint}
        hasErrors={hasErrors}
        logicIssues={logicIssues}
        isBitMonitorOpen={isBitMonitorOpen}
        onToggleBitMonitor={() => setIsBitMonitorOpen(v => !v)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Program Loaded Notification Banner */}
      {loadNotice && (
        <div role="status" className="bg-emerald-500 text-slate-950 font-bold text-xs py-1.5 px-4 flex items-center justify-center gap-2 shadow-md">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{loadNotice}</span>
        </div>
      )}

      {/* 2. Main View Area */}
      <div className="flex-1 flex flex-col p-2 sm:p-3 overflow-hidden">
        {activeMainTab === 'simulator' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Sub-View Segmented Switch (visible on screens < lg) */}
            <div className="flex lg:hidden bg-slate-900 border border-slate-800 rounded-xl p-1 mb-2 font-bold text-xs shrink-0 shadow-sm">
              <button
                aria-pressed={mobileView === 'ladder'} onClick={() => setMobileView('ladder')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mobileView === 'ladder'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🪜 Ladder Logic Canvas</span>
              </button>
              <button
                aria-pressed={mobileView === 'bench'} onClick={() => setMobileView('bench')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mobileView === 'bench'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🎛️ Hardware Bench</span>
              </button>
            </div>

            {/* Desktop side-by-side or Mobile toggled views */}
            <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
              {/* Left: Hardware Trainer */}
              <div className={`w-full lg:w-[380px] shrink-0 flex-col overflow-y-auto ${
                mobileView === 'bench' ? 'flex flex-1' : 'hidden lg:flex'
              }`}>
                <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1 mb-2">
                  <button
                    onClick={() => setActiveSandbox('HardwareTrainer')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${activeSandbox === 'HardwareTrainer' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    PLC 1: Lights & Switches
                  </button>
                  <button
                    onClick={() => setActiveSandbox('MetalShear')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-colors ${activeSandbox === 'MetalShear' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    PLC 2: Metal Shear
                  </button>
                </div>
                {activeSandbox === 'HardwareTrainer' ? (
                  <HardwareTrainer
                    plcData={plcData}
                    onToggleInput={handleToggleInput}
                    isRunning={isRunning}
                    theme={theme}
                    symbols={symbols}
                  />
                ) : (
                  <MetalShearSandbox
                    plcData={plcData}
                    onToggleInput={handleToggleInput}
                    isRunning={isRunning}
                  />
                )}
              </div>

              {/* Right: Ladder Editor */}
              <div className={`flex-1 flex-col overflow-hidden min-w-0 ${
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
                  symbols={symbols}
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
        symbols={symbols}
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


