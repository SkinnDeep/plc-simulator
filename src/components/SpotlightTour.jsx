import React, { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export function SpotlightTour({
  isActive,
  onComplete,
  rungs,
  isRunning,
  plcData
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  // Define the tour steps and their completion conditions
  const steps = React.useMemo(() => [
    {
      id: 'tour-stop-mode',
      targetId: 'tour-controls', // Points to the header controls
      title: 'Step 1: Stop the PLC',
      text: 'If the PLC is running, you cannot edit logic. Make sure it says RUN (meaning it is currently stopped) before continuing.',
      isComplete: () => !isRunning,
      position: 'bottom'
    },
    {
      id: 'tour-add-contact',
      targetId: 'tour-palette',
      title: 'Step 2: Add an Input Contact',
      text: 'Click the XIC (-] [-) button in the palette to add a Normally Open contact to your rung.',
      isComplete: () => rungs[0]?.items?.some(it => !['OTE', 'OTL', 'OTU', 'TON', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(it.type)),
      position: 'bottom'
    },
    {
      id: 'tour-add-coil',
      targetId: 'tour-palette',
      title: 'Step 3: Add an Output Coil',
      text: 'Now click the OTE (-( )-) button to add an output coil to the end of your rung.',
      isComplete: () => rungs[0]?.items?.some(it => ['OTE', 'OTL', 'OTU', 'TON', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(it.type)),
      position: 'bottom'
    },
    {
      id: 'tour-assign-address',
      targetId: 'tour-rungs',
      title: 'Step 4: Assign I/O Addresses',
      text: 'Click the "Assign ⌄" button above your new instructions. Set the input to Switch 1 (I:0/0) and the output to Amber Lamp 1 (O:0/0).',
      isComplete: () => {
        const hasI = rungs[0]?.items?.some(it => it.operand === 'I:0/0');
        const hasO = rungs[0]?.items?.some(it => it.operand === 'O:0/0');
        return hasI && hasO;
      },
      position: 'top'
    },
    {
      id: 'tour-run',
      targetId: 'tour-run',
      title: 'Step 5: Run the Program',
      text: 'Awesome! Now click RUN in the top menu to start scanning your new logic.',
      isComplete: () => isRunning,
      position: 'bottom'
    },
    {
      id: 'tour-test-hardware',
      targetId: 'tour-trainer',
      title: 'Step 6: Test the Hardware',
      text: 'With the program running, toggle Switch 1 (I:0/0) on the hardware bench to see the Amber Lamp light up!',
      isComplete: () => plcData?.bits?.['I:0/0'] === true,
      position: 'right'
    }
  ], [isRunning, rungs, plcData]);

  const step = steps[currentStep];

  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
    }
  }, [isActive]);

  // Track element position
  useEffect(() => {
    if (!isActive || !step) return;

    const updateRect = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(prev => {
          if (!prev || prev.top !== rect.top || prev.left !== rect.left || prev.width !== rect.width || prev.height !== rect.height) {
            return rect;
          }
          return prev;
        });
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    
    // Poll just in case the UI shifted
    const interval = setInterval(updateRect, 500);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearInterval(interval);
    };
  }, [isActive, step]);

  if (!isActive || !step || !targetRect) return null;

  // Calculate tooltip placement
  const padding = 8;
  const top = targetRect.top - padding;
  const left = targetRect.left - padding;
  const width = targetRect.width + padding * 2;
  const height = targetRect.height + padding * 2;

  let tooltipStyle = {};
  if (step.position === 'bottom') {
    tooltipStyle = { top: top + height + 10, left: Math.max(10, left + width / 2 - 150) };
  } else if (step.position === 'top') {
    tooltipStyle = { top: Math.max(10, top - 120), left: Math.max(10, left + width / 2 - 150) };
  } else if (step.position === 'right') {
    tooltipStyle = { top: top + height / 2 - 60, left: left + width + 10 };
  } else {
    tooltipStyle = { top: top + height + 10, left };
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* SVG Overlay to create the cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx="8"
              fill="black"
              className="transition-all duration-300 ease-in-out"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Instructional Tooltip */}
      <div 
        className="absolute w-[300px] bg-[#1e1e1e] border-2 border-cyan-500 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] p-4 pointer-events-auto transition-all duration-300 ease-in-out"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-cyan-300 text-sm flex items-center gap-2">
            {step.title}
          </h3>
          <button onClick={onComplete} className="text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">
          {step.text}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full ${i === currentStep ? 'bg-cyan-400' : i < currentStep ? 'bg-emerald-500' : 'bg-slate-600'}`} 
                />
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={onComplete}
                className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Skip
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(s => s + 1)}
                  disabled={!step.isComplete()}
                  className={`px-3 py-1 text-xs font-bold rounded transition ${
                    step.isComplete() 
                      ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.5)] cursor-pointer'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={onComplete}
                  disabled={!step.isComplete()}
                  className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1 ${
                    step.isComplete() 
                      ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)] cursor-pointer'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Finish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default SpotlightTour;
