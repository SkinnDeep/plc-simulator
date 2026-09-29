import React, { useEffect, useState, useRef } from 'react';
import { CircleDot } from 'lucide-react';

export function MetalShearSandbox({ plcData, onToggleInput, isRunning }) {
  const isBitOn = (addr) => !!plcData?.bits?.[addr];

  const conv1On = isBitOn('O:0/0');
  const conv2On = isBitOn('O:0/1');
  const bladeDown = isBitOn('O:0/2');

  const containerRef = useRef(null);

  const onToggleInputRef = useRef(onToggleInput);
  useEffect(() => {
    onToggleInputRef.current = onToggleInput;
  }, [onToggleInput]);

  // Simulation state
  const stateRef = useRef({
    stripX: 0,
    bladeY: 0, // 0 = up, 100 = down
    cutSheets: [], // { id, headX, tailX }
    nextSheetId: 0,
    sensors: {
      PROX: false,
      UP_LS: true,
      DOWN_LS: false,
    }
  });

  const [uiState, setUiState] = useState({
    stripX: 0,
    bladeY: 0,
    cutSheets: [],
    sensors: { PROX: false, UP_LS: true, DOWN_LS: false }
  });

  const SHEAR_X = 100;
  const PROX_X = 170;
  const DROP_X = 230;
  const SPEED = 0.6;
  const BLADE_SPEED = 2.5;

  const toPct = (val) => `${(val / DROP_X) * 100}%`;

  useEffect(() => {
    let animFrame;
    const loop = () => {
      animFrame = requestAnimationFrame(loop);
      if (!isRunning) return; // Freeze mechanics if PLC is stopped

      const state = stateRef.current;
      let { stripX, bladeY, cutSheets, sensors } = state;

      // Move Blade
      if (bladeDown) {
        bladeY = Math.min(100, bladeY + BLADE_SPEED);
      } else {
        bladeY = Math.max(0, bladeY - BLADE_SPEED);
      }

      // Move Strip
      if (conv1On) {
        if (stripX < SHEAR_X) {
          stripX += SPEED;
        } else if (conv2On) {
          stripX += SPEED;
        }
      }

      // Cut Logic
      if (bladeY >= 100 && stripX > SHEAR_X) {
        cutSheets.push({
          id: state.nextSheetId++,
          headX: stripX,
          tailX: SHEAR_X
        });
        stripX = SHEAR_X;
      }

      // Move Cut Sheets
      if (conv2On) {
        for (let s of cutSheets) {
          s.headX += SPEED;
          s.tailX += SPEED;
        }
        cutSheets = cutSheets.filter(s => s.tailX < DROP_X);
      }

      // Update Sensors
      const proxOn = (stripX >= PROX_X) || cutSheets.some(s => s.tailX <= PROX_X && s.headX >= PROX_X);
      const downOn = (bladeY >= 100);
      const upOn = (bladeY <= 0);

      // Check differences and send to engine
      if (proxOn !== sensors.PROX) {
        sensors.PROX = proxOn;
        onToggleInputRef.current('I:0/2', proxOn);
      }
      if (downOn !== sensors.DOWN_LS) {
        sensors.DOWN_LS = downOn;
        onToggleInputRef.current('I:0/3', downOn);
      }
      if (upOn !== sensors.UP_LS) {
        sensors.UP_LS = upOn;
        onToggleInputRef.current('I:0/4', upOn);
      }

      state.stripX = stripX;
      state.bladeY = bladeY;
      state.cutSheets = cutSheets;

      // Update UI state
      setUiState({ stripX, bladeY, cutSheets: [...cutSheets], sensors: { ...sensors } });
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isRunning, conv1On, conv2On, bladeDown]);

  const [activePress, setActivePress] = useState(null);

  useEffect(() => {
    const handleGlobalRelease = () => {
      if (activePress === 'START') {
        onToggleInputRef.current('I:0/0', false);
      } else if (activePress === 'STOP') {
        onToggleInputRef.current('I:0/1', true); // Stop is N.C. so release means ON
      }
      setActivePress(null);
    };
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
  }, [activePress]);

  // Init N.C. Stop Button to TRUE on mount
  const isInitialized = useRef(false);
  useEffect(() => {
    if (!isInitialized.current) {
      onToggleInputRef.current('I:0/1', true);
      isInitialized.current = true;
    }
  }, []);

  return (
    <div className="bg-[#212328] border-2 border-[#3c414a] rounded-2xl p-4 shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col gap-4 select-none relative overflow-hidden h-[450px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
            MS
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>Metal Shear Station</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                SANDBOX
              </span>
            </h3>
            <div className="text-[9px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1"><CircleDot className="w-2.5 h-2.5" /> PLC 2 Environment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Physics Viewer */}
      <div className="flex-1 bg-black rounded-xl border border-slate-700 relative overflow-hidden" ref={containerRef}>
        {/* Conveyor 1 */}
        <div 
          className="absolute bottom-4 h-4 bg-slate-800 border-t border-slate-600 flex items-center justify-around overflow-hidden"
          style={{ left: 0, width: toPct(SHEAR_X) }}
        >
          <div className={`w-3 h-3 rounded-full border-2 border-slate-500 ${conv1On ? 'animate-spin' : ''}`} />
          <div className={`w-3 h-3 rounded-full border-2 border-slate-500 ${conv1On ? 'animate-spin' : ''}`} />
        </div>
        <div className="absolute bottom-0 text-[8px] text-slate-500" style={{ left: toPct(SHEAR_X / 2 - 10) }}>Conv 1</div>

        {/* Conveyor 2 */}
        <div 
          className="absolute bottom-4 h-4 bg-slate-800 border-t border-slate-600 flex items-center justify-around overflow-hidden"
          style={{ left: toPct(SHEAR_X + 2), right: 0 }}
        >
          <div className={`w-3 h-3 rounded-full border-2 border-slate-500 ${conv2On ? 'animate-spin' : ''}`} />
          <div className={`w-3 h-3 rounded-full border-2 border-slate-500 ${conv2On ? 'animate-spin' : ''}`} />
        </div>
        <div className="absolute right-4 bottom-0 text-[8px] text-slate-500">Conv 2</div>

        {/* The Strip */}
        <div 
          className="absolute bottom-8 h-2 bg-slate-300"
          style={{ left: 0, width: toPct(uiState.stripX) }}
        />

        {/* Cut Sheets */}
        {uiState.cutSheets.map(sheet => (
          <div 
            key={sheet.id}
            className="absolute bottom-8 h-2 bg-slate-300 border-l border-slate-400"
            style={{ left: toPct(sheet.tailX), width: toPct(sheet.headX - sheet.tailX) }}
          />
        ))}

        {/* PROX Sensor */}
        <div 
          className="absolute top-10 w-2 h-8 bg-yellow-600/30 border-l border-r border-yellow-600/50"
          style={{ left: toPct(PROX_X) }}
        >
           <div className={`absolute -bottom-2 -left-1 w-4 h-4 rounded-full border-2 ${uiState.sensors.PROX ? 'bg-green-400 border-green-200 shadow-[0_0_8px_#4ade80]' : 'bg-slate-700 border-slate-500'}`} />
           <span className="absolute -top-4 -left-3 text-[8px] text-yellow-500 font-mono">PROX</span>
        </div>

        {/* Shear Blade */}
        <div 
          className="absolute top-0 bottom-8 w-2 flex flex-col items-center"
          style={{ left: toPct(SHEAR_X) }}
        >
          {/* Cylinder Body */}
          <div className="w-8 h-12 bg-slate-600 border border-slate-500 z-10 relative">
            <span className="absolute -top-4 -left-6 text-[8px] text-slate-400 font-mono whitespace-nowrap">SHEAR_CYL</span>
          </div>
          {/* Rod */}
          <div 
            className="w-2 bg-slate-400 origin-top z-0"
            style={{ height: `${20 + (uiState.bladeY * 0.5)}%` }}
          />
          {/* Blade */}
          <div className="w-10 h-6 bg-slate-300 border-b-4 border-slate-200 shadow-md relative">
             <div className="absolute inset-x-1 bottom-0 h-2 bg-slate-100" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
          </div>
        </div>

        {/* Limit Switches UI indicator */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 text-[9px] font-mono bg-slate-900/60 p-2 rounded">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${uiState.sensors.UP_LS ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-slate-700'}`} />
            <span className={uiState.sensors.UP_LS ? 'text-cyan-300 font-bold' : 'text-slate-500'}>UP_LS (I:0/4)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${uiState.sensors.DOWN_LS ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-slate-700'}`} />
            <span className={uiState.sensors.DOWN_LS ? 'text-cyan-300 font-bold' : 'text-slate-500'}>DOWN_LS (I:0/3)</span>
          </div>
        </div>
      </div>

      {/* Control Panel (Pushbuttons) */}
      <div className="flex justify-center gap-12 pt-2 pb-1 shrink-0 bg-[#2a2d34] rounded-xl p-2 border border-[#3c414a]">
        <div className="flex flex-col items-center gap-2">
          <button
            onMouseDown={() => { setActivePress('START'); onToggleInput('I:0/0', true); }}
            onTouchStart={() => { setActivePress('START'); onToggleInput('I:0/0', true); }}
            className={`w-14 h-14 rounded-full border-4 shadow-xl flex items-center justify-center transition-all outline-none ${
              activePress === 'START' || isBitOn('I:0/0')
                ? 'bg-green-600 border-green-800 scale-95 shadow-inner'
                : 'bg-green-500 border-green-700 hover:bg-green-400'
            }`}
          >
            <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-md">
              Start
            </span>
          </button>
          <div className="text-center">
            <div className="text-[10px] font-bold text-cyan-300 font-mono">I:0/0</div>
            <div className="text-[9px] text-slate-400">START_PB (N.O.)</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onMouseDown={() => { setActivePress('STOP'); onToggleInput('I:0/1', false); }}
            onTouchStart={() => { setActivePress('STOP'); onToggleInput('I:0/1', false); }}
            className={`w-14 h-14 rounded-full border-4 shadow-xl flex items-center justify-center transition-all outline-none ${
              activePress === 'STOP' || !isBitOn('I:0/1')
                ? 'bg-red-700 border-red-900 scale-95 shadow-inner'
                : 'bg-red-600 border-red-800 hover:bg-red-500'
            }`}
          >
            <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-md">
              Stop
            </span>
          </button>
          <div className="text-center">
            <div className="text-[10px] font-bold text-cyan-300 font-mono">I:0/1</div>
            <div className="text-[9px] text-slate-400">STOP_PB (N.C.)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
