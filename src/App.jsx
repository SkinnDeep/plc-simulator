import React, { useState, useEffect, useRef } from 'react';
import { PLCEngine } from './engine/plcEngine';
import { createInitialDataModel } from './types/plcTypes';
import { SAMPLE_PROGRAMS } from './data/samplePrograms';
import { Header } from './components/Header';
import { HardwareTrainer } from './components/HardwareTrainer';
import { LadderEditor } from './components/LadderEditor';
import { LearningTab } from './components/LearningTab';
import { TutorialModal } from './components/TutorialModal';
import { validateLadderLogic } from './engine/plcValidator';
import { Check } from 'lucide-react';

const INITIAL_BLANK_RUNGS = [
  {
    id: 'r0',
    comment: 'Rung 000: Control logic (drag instructions and I/O to begin)',
    items: []
  }
];

export function App() {
  const [plcData, setPlcData] = useState(() => createInitialDataModel());
  const [isRunning, setIsRunning] = useState(true);
  const [currentRungs, setCurrentRungs] = useState(() => INITIAL_BLANK_RUNGS);
  const [scanResult, setScanResult] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('simulator'); // 'simulator' | 'learning'
  const [loadNotice, setLoadNotice] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const engineRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = new PLCEngine(createInitialDataModel());
  }

  const engine = engineRef.current;

  // Real-time ladder logic error validation
  const logicIssues = validateLadderLogic(currentRungs);
  const hasErrors = logicIssues.some(i => i.severity === 'error');

  // Check first-time tutorial
  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenPlcTutorial');
    if (!hasSeen) {
      setIsHelpOpen(true);
      localStorage.setItem('hasSeenPlcTutorial', 'true');
    }
  }, []);

  // Synchronize rungs with engine
  useEffect(() => {
    engine.currentRungs = currentRungs;
    const res = engine.executeScanCycle(currentRungs);
    setScanResult(res);
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

  const handleToggleRun = () => {
    if (isRunning) {
      engine.stop();
      setIsRunning(false);
    } else {
      engine.start();
      setIsRunning(true);
    }
  };

  const handleToggleInput = (address, val) => {
    engine.setBit(address, val);
    const res = engine.executeScanCycle(currentRungs);
    setPlcData({
      bits: { ...engine.data.bits },
      T4: engine.data.T4.map(t => ({ ...t })),
      N7: [...engine.data.N7],
      S2: { ...engine.data.S2 }
    });
    setScanResult(res);
  };

  const handleResetMemory = () => {
    const fresh = createInitialDataModel();
    engine.data = fresh;
    if (engine.latchedOutputs) engine.latchedOutputs.clear();
    setPlcData(fresh);
    const res = engine.executeScanCycle(currentRungs);
    setScanResult(res);
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
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Header Toolbar */}
      <Header
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
        onResetMemory={handleResetMemory}
        activeMainTab={activeMainTab}
        onChangeMainTab={setActiveMainTab}
        onSelectSampleProgram={handleSelectSampleProgram}
        onOpenHelp={() => setIsHelpOpen(true)}
        hasErrors={hasErrors}
      />

      {/* Program Loaded Notification Banner */}
      {loadNotice && (
        <div className="bg-emerald-500 text-slate-950 font-bold text-xs py-1.5 px-4 flex items-center justify-center gap-2 shadow-md">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{loadNotice}</span>
        </div>
      )}

      {/* 2. Main View Area */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        {activeMainTab === 'simulator' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
            {/* Left: Hardware Trainer */}
            <div className="w-full lg:w-[410px] shrink-0 flex flex-col overflow-y-auto">
              <HardwareTrainer
                plcData={plcData}
                onToggleInput={handleToggleInput}
                isRunning={isRunning}
              />
            </div>

            {/* Right: Ladder Editor */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <LadderEditor
                rungs={currentRungs}
                onChangeRungs={setCurrentRungs}
                scanResult={scanResult}
                plcData={plcData}
              />
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

      {/* 3. Interactive Tutorial & Help Modal */}
      <TutorialModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
export default App;
