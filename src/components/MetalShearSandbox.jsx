import React, { useEffect, useState, useRef } from 'react';
import { Scissors, Activity, SlidersHorizontal, ArrowRight, Gauge, RotateCcw } from 'lucide-react';

export function MetalShearSandbox({ plcData, onToggleInput, isRunning, theme = 'dark', symbols = {} }) {
  const isBitOn = (addr) => !!plcData?.bits?.[addr];

  const conv1On = isBitOn('O:0/0');
  const conv2On = isBitOn('O:0/1');
  const bladeDown = isBitOn('O:0/2');
  const conv3On = isBitOn('O:0/3');

  const containerRef = useRef(null);

  const onToggleInputRef = useRef(onToggleInput);
  useEffect(() => {
    onToggleInputRef.current = onToggleInput;
  }, [onToggleInput]);

  // Simulation state
  const stateRef = useRef({
    stripX: 0,
    bladeY: 0, // 0 = UP (retracted), 100 = DOWN (fully through metal)
    cutSheets: [], // { id, headX, tailX }
    nextSheetId: 0,
    cutCount: 0,
    partsDropped: 0,
    cutFlash: 0,
    hasCutThisStroke: false,
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
    cutCount: 0,
    partsDropped: 0,
    cutFlash: 0,
    sensors: { PROX: false, UP_LS: true, DOWN_LS: false }
  });

  const SHEAR_X = 80;
  const END_CONV2_X = 180;
  const PROX_X = 160;
  const DROP_X = 280;
  const SPEED = 0.6;
  const BLADE_SPEED = 2.4;

  const toPct = (val) => `${(val / DROP_X) * 100}%`;

  useEffect(() => {
    let animFrame;
    const loop = () => {
      animFrame = requestAnimationFrame(loop);
      if (!isRunning) return; // Freeze mechanics if PLC is stopped

      const state = stateRef.current;
      let { stripX, bladeY, cutSheets, sensors } = state;

      // 1. Move Blade
      if (bladeDown) {
        bladeY = Math.min(100, bladeY + BLADE_SPEED);
      } else {
        bladeY = Math.max(0, bladeY - BLADE_SPEED);
      }

      // Reset cut trigger flag when blade retracts toward top
      if (bladeY <= 25) {
        state.hasCutThisStroke = false;
      }

      // 2. Limit Switches:
      // UP_LS: True when blade is fully retracted at top dead center
      const upOn = (bladeY <= 3);

      // DOWN_LS: True when shearing blade actually touches and penetrates the metal
      // At bladeY >= 92, the blade contacts the metal sheet at 135px and cuts through to 143px
      const downOn = (bladeY >= 92);

      // 3. Move Strip (Continuous coil feed from decoiler/Conv 1)
      // Advances if Conv 1 is running (infeed drive pushes strip forward across shear bed),
      // OR if Conv 2 is running and strip has already reached Conv 2.
      // Metal passage is physically blocked only if the shear blade is lowered (bladeY > 25).
      const bladeBlocksStrip = bladeY > 25;
      if (!bladeBlocksStrip) {
        if (conv1On || (stripX >= SHEAR_X && conv2On)) {
          stripX += SPEED;
        }
      }

      // 4. Shearing / Cut Logic
      // Cut executes when the blade reaches the metal (downOn) during a downward stroke
      if (downOn && !state.hasCutThisStroke) {
        state.hasCutThisStroke = true;
        if (stripX > SHEAR_X) {
          cutSheets.push({
            id: state.nextSheetId++,
            headX: stripX,
            tailX: SHEAR_X + 2.5 // Visible 2.5px severance kerf between strip and cut piece
          });
          stripX = SHEAR_X;
          state.cutCount = (state.cutCount || 0) + 1;
          state.cutFlash = 15; // 15 frames of cut spark flash
        }
      }

      // Decrement cut flash
      if (state.cutFlash > 0) {
        state.cutFlash--;
      }

      // 5. Move Cut Sheets
      // If advancing continuous strip catches up with a cut sheet on Conv 2, it pushes that piece forward
      for (let s of cutSheets) {
        if (stripX >= s.tailX) {
          const pushDelta = (stripX - s.tailX) + 2;
          s.tailX += pushDelta;
          s.headX += pushDelta;
        }
      }

      // Advance cut sheets via conveyor motors
      for (let s of cutSheets) {
        const onConv2 = s.tailX < END_CONV2_X;
        const onConv3 = s.headX >= END_CONV2_X;
        if ((onConv2 && conv2On) || (onConv3 && conv3On)) {
          s.headX += SPEED;
          s.tailX += SPEED;
        }
      }

      // Collect sheets that reach the end into the finished parts bin
      const remainingSheets = [];
      for (let s of cutSheets) {
        if (s.tailX >= DROP_X) {
          state.partsDropped = (state.partsDropped || 0) + 1;
        } else {
          remainingSheets.push(s);
        }
      }
      cutSheets = remainingSheets;

      // 6. Proximity Sensor (PROX):
      // Detects continuous strip leading edge OR any cut sheet passing beneath its beam
      const proxOn = (stripX >= PROX_X) || cutSheets.some(s => s.tailX <= PROX_X && s.headX >= PROX_X);

      // Check differences against current PLC bit values and send to PLC engine
      const currentProx = isBitOn('I:0/2');
      const currentDown = isBitOn('I:0/3');
      const currentUp = isBitOn('I:0/4');

      if (proxOn !== currentProx || proxOn !== sensors.PROX) {
        sensors.PROX = proxOn;
        onToggleInputRef.current('I:0/2', proxOn);
      }
      if (downOn !== currentDown || downOn !== sensors.DOWN_LS) {
        sensors.DOWN_LS = downOn;
        onToggleInputRef.current('I:0/3', downOn);
      }
      if (upOn !== currentUp || upOn !== sensors.UP_LS) {
        sensors.UP_LS = upOn;
        onToggleInputRef.current('I:0/4', upOn);
      }

      state.stripX = stripX;
      state.bladeY = bladeY;
      state.cutSheets = cutSheets;

      // Update UI state
      setUiState({
        stripX,
        bladeY,
        cutSheets: [...cutSheets],
        cutCount: state.cutCount || 0,
        partsDropped: state.partsDropped || 0,
        cutFlash: state.cutFlash || 0,
        sensors: { ...sensors }
      });
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isRunning, conv1On, conv2On, bladeDown]);

  // Multitouch pointer tracking: maps pointerId -> 'START' | 'STOP'
  const pointerMap = useRef(new Map());
  const pressedMap = useRef(new Map());

  const pressButton = (pointerId, action) => {
    pointerMap.current.set(pointerId, action);
    if (!pressedMap.current.has(action)) {
      pressedMap.current.set(action, new Set());
    }
    const set = pressedMap.current.get(action);
    set.add(pointerId);
    if (set.size === 1) {
      if (action === 'START') {
        onToggleInputRef.current('I:0/0', true);
      } else if (action === 'STOP') {
        onToggleInputRef.current('I:0/1', false); // Stop is N.C. so pressing breaks circuit
      }
    }
  };

  const releaseButton = (pointerId, specificAction) => {
    const action = specificAction || pointerMap.current.get(pointerId);
    if (pointerId !== undefined) {
      pointerMap.current.delete(pointerId);
    }
    if (!action) return;

    const set = pressedMap.current.get(action);
    if (set) {
      if (pointerId !== undefined) {
        set.delete(pointerId);
      } else {
        set.clear();
      }
      if (set.size === 0) {
        pressedMap.current.delete(action);
        if (action === 'START') {
          onToggleInputRef.current('I:0/0', false);
        } else if (action === 'STOP') {
          onToggleInputRef.current('I:0/1', true); // Stop is N.C. so releasing restores circuit
        }
      }
    }
  };

  const releaseAllButtons = () => {
    pointerMap.current.clear();
    if (pressedMap.current.has('START')) {
      onToggleInputRef.current('I:0/0', false);
    }
    if (pressedMap.current.has('STOP')) {
      onToggleInputRef.current('I:0/1', true);
    }
    pressedMap.current.clear();
  };

  useEffect(() => {
    const onWindowPointerUp = (e) => {
      if (pointerMap.current.has(e.pointerId)) {
        releaseButton(e.pointerId);
      }
    };
    const onWindowBlur = () => releaseAllButtons();
    const onVisibilityChange = () => { if (document.hidden) releaseAllButtons(); };

    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseAllButtons();
    };
  }, []);

  // Maintain N.C. Stop Button state: always TRUE unless actively pressed
  useEffect(() => {
    const isStopHeld = (pressedMap.current.get('STOP')?.size || 0) > 0;
    if (!isStopHeld && !isBitOn('I:0/1')) {
      onToggleInputRef.current('I:0/1', true);
    }
  }, [plcData?.bits?.['I:0/1']]);

  const handleResetMetal = () => {
    stateRef.current.stripX = 0;
    stateRef.current.bladeY = 0;
    stateRef.current.cutSheets = [];
    stateRef.current.nextSheetId = 0;
    stateRef.current.cutCount = 0;
    stateRef.current.partsDropped = 0;
    stateRef.current.cutFlash = 0;
    stateRef.current.hasCutThisStroke = false;
    stateRef.current.sensors = {
      PROX: false,
      UP_LS: true,
      DOWN_LS: false,
    };
    onToggleInputRef.current('I:0/2', false);
    onToggleInputRef.current('I:0/3', false);
    onToggleInputRef.current('I:0/4', true);
    setUiState({
      stripX: 0,
      bladeY: 0,
      cutSheets: [],
      cutCount: 0,
      partsDropped: 0,
      cutFlash: 0,
      sensors: { PROX: false, UP_LS: true, DOWN_LS: false }
    });
  };

  const isStartPressed = isBitOn('I:0/0');
  const isStopPressed = !isBitOn('I:0/1');

  return (
    <div id="tour-trainer" className="hardware-trainer metal-shear-trainer select-none">
      {/* 1. Header & Module Identification */}
      <div className="controller-heading">
        <span className="controller-icon" style={{ color: '#f97316', borderColor: 'rgba(249,115,22,0.35)', background: 'rgba(249,115,22,0.1)' }}>
          <Scissors size={20} strokeWidth={1.5} />
        </span>
        <div>
          <h3>Metal Shear Station</h3>
          <p>Continuous Sheet Cut-to-Length</p>
        </div>
        <span className={`controller-state ${isRunning ? 'on' : ''}`}>
          <i />{isRunning ? 'Running' : 'Idle'}
        </span>
      </div>

      {/* 2. Simulation Viewport Section */}
      <section className="hardware-section" style={{ padding: '12px 14px' }}>
        <div className="hardware-section-heading" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4><Activity size={14} />Simulation cell</h4>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700/80 text-[10px] font-mono shadow-inner">
              <span className="text-slate-400">Cut:</span>
              <span className="font-bold text-amber-400">{uiState.cutCount}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Bin:</span>
              <span className="font-bold text-emerald-400">{uiState.partsDropped}</span>
            </div>
            <button
              onClick={handleResetMetal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/60 transition cursor-pointer active:scale-95 shadow-sm"
              title="Reset metal strip and cut sheets back to initial position"
            >
              <RotateCcw size={12} className="text-amber-400" />
              <span>Reset Metal</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono">O:0/0-3 · I:0/2-4</span>
          </div>
        </div>

        {/* Viewport Frame */}
        <div 
          className="relative bg-slate-950/90 rounded-lg border border-slate-700/80 overflow-hidden shadow-inner"
          style={{ height: '175px' }}
          ref={containerRef}
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

          {/* Viewport Reset Metal Button Overlay */}
          <button
            onClick={handleResetMetal}
            className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-slate-900/85 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/80 text-slate-200 hover:text-amber-300 backdrop-blur-sm transition-all cursor-pointer shadow-md active:scale-95"
            title="Reset metal strip and cut pieces back to start"
          >
            <RotateCcw size={12} className="text-amber-400" />
            <span>Reset Metal</span>
          </button>

          {/* Status Overlay: Limit Switches & Sensors */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-20 text-[9px] font-mono">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  kind: 'io',
                  addr: 'I:0/4',
                  label: symbols?.['I:0/4'] || 'UP_LS',
                  isOutput: false
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing hover:border-cyan-400 ${
                uiState.sensors.UP_LS 
                  ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300' 
                  : 'bg-slate-900/60 border-slate-700/50 text-slate-400'
              }`}
              title="Drag UP_LS (I:0/4) to rung or contact"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${uiState.sensors.UP_LS ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600'}`} />
              <span><span className="opacity-40">⠿</span> UP_LS (I:0/4)</span>
            </div>
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  kind: 'io',
                  addr: 'I:0/3',
                  label: symbols?.['I:0/3'] || 'DOWN_LS',
                  isOutput: false
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing hover:border-amber-400 ${
                uiState.sensors.DOWN_LS 
                  ? 'bg-amber-950/70 border-amber-500/50 text-amber-300' 
                  : 'bg-slate-900/60 border-slate-700/50 text-slate-400'
              }`}
              title="Drag DOWN_LS (I:0/3) to rung or contact"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${uiState.sensors.DOWN_LS ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-slate-600'}`} />
              <span><span className="opacity-40">⠿</span> DOWN_LS (I:0/3)</span>
            </div>
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  kind: 'io',
                  addr: 'I:0/2',
                  label: symbols?.['I:0/2'] || 'PROX',
                  isOutput: false
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-colors cursor-grab active:cursor-grabbing hover:border-yellow-400 ${
                uiState.sensors.PROX 
                  ? 'bg-yellow-950/70 border-yellow-500/50 text-yellow-300' 
                  : 'bg-slate-900/60 border-slate-700/50 text-slate-400'
              }`}
              title="Drag PROX (I:0/2) to rung or contact"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${uiState.sensors.PROX ? 'bg-yellow-400 shadow-[0_0_6px_#eab308]' : 'bg-slate-600'}`} />
              <span><span className="opacity-40">⠿</span> PROX (I:0/2)</span>
            </div>
          </div>

          {/* Hardened Shear Anvil / Bed beneath the blade */}
          <div 
            className="absolute bottom-4 w-5 h-5 bg-gradient-to-t from-slate-800 to-slate-700 border-x border-t border-slate-500 shadow-md z-0 flex flex-col items-center justify-start pointer-events-none"
            style={{ left: `calc(${toPct(SHEAR_X)} - 10px)` }}
          >
            <div className="w-full h-1 bg-amber-500/40 border-b border-amber-600/50" />
            <span className="text-[5.5px] font-mono text-slate-400 mt-0.5">ANVIL</span>
          </div>

          {/* Conveyor 1 (Infeed) */}
          <div 
            className={`absolute bottom-4 h-4 border-t flex items-center justify-around overflow-hidden transition-colors ${
              conv1On 
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                : 'bg-slate-900/80 border-slate-700/70'
            }`}
            style={{ left: 0, width: toPct(SHEAR_X - 2) }}
          >
            <div className={`w-2.5 h-2.5 rounded-full border ${conv1On ? 'border-emerald-400 animate-spin bg-emerald-500/30' : 'border-slate-600'}`} />
            <div className={`w-2.5 h-2.5 rounded-full border ${conv1On ? 'border-emerald-400 animate-spin bg-emerald-500/30' : 'border-slate-600'}`} />
          </div>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                kind: 'io',
                addr: 'O:0/0',
                label: symbols?.['O:0/0'] || 'CONV1',
                isOutput: true
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="absolute bottom-0 text-[8px] font-mono flex items-center gap-1 cursor-grab active:cursor-grabbing hover:bg-slate-800/90 px-1 rounded border border-transparent hover:border-slate-600"
            style={{ left: toPct(SHEAR_X / 2 - 14) }}
            title="Drag CONV1 (O:0/0) to rung or coil"
          >
            <span className={conv1On ? 'text-emerald-400 font-bold' : 'text-slate-400'}><span className="opacity-40">⠿ </span>CONV1 (O:0/0)</span>
          </div>

          {/* Conveyor 2 (Mid / Cut-to-length) */}
          <div 
            className={`absolute bottom-4 h-4 border-t flex items-center justify-around overflow-hidden transition-colors ${
              conv2On 
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                : 'bg-slate-900/80 border-slate-700/70'
            }`}
            style={{ left: toPct(SHEAR_X + 2), width: toPct(END_CONV2_X - SHEAR_X - 4) }}
          >
            <div className={`w-2.5 h-2.5 rounded-full border ${conv2On ? 'border-emerald-400 animate-spin bg-emerald-500/30' : 'border-slate-600'}`} />
            <div className={`w-2.5 h-2.5 rounded-full border ${conv2On ? 'border-emerald-400 animate-spin bg-emerald-500/30' : 'border-slate-600'}`} />
          </div>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                kind: 'io',
                addr: 'O:0/1',
                label: symbols?.['O:0/1'] || 'CONV2',
                isOutput: true
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="absolute bottom-0 text-[8px] font-mono flex items-center gap-1 cursor-grab active:cursor-grabbing hover:bg-slate-800/90 px-1 rounded border border-transparent hover:border-slate-600"
            style={{ left: toPct((SHEAR_X + END_CONV2_X) / 2 - 14) }}
            title="Drag CONV2 (O:0/1) to rung or coil"
          >
            <span className={conv2On ? 'text-emerald-400 font-bold' : 'text-slate-400'}><span className="opacity-40">⠿ </span>CONV2 (O:0/1)</span>
          </div>

          {/* Conveyor 3 (Exit to Bin) */}
          <div 
            className={`absolute bottom-4 h-4 border-t flex items-center justify-around overflow-hidden transition-colors ${
              conv3On 
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                : 'bg-slate-900/80 border-slate-700/70'
            }`}
            style={{ left: toPct(END_CONV2_X), right: 0 }}
          >
            <div className={`w-2.5 h-2.5 rounded-full border ${conv3On ? 'border-emerald-400 animate-spin bg-emerald-500/30' : 'border-slate-600'}`} />
            <div className={`w-2.5 h-2.5 rounded-full border ${conv3On ? 'border-emerald-400 animate-spin bg-emerald-500/30' : 'border-slate-600'}`} />
          </div>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                kind: 'io',
                addr: 'O:0/3',
                label: symbols?.['O:0/3'] || 'CONV3',
                isOutput: true
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="absolute bottom-0 text-[8px] font-mono flex items-center gap-1 cursor-grab active:cursor-grabbing hover:bg-slate-800/90 px-1 rounded border border-transparent hover:border-slate-600"
            style={{ left: toPct((END_CONV2_X + DROP_X) / 2 - 14) }}
            title="Drag CONV3 (O:0/3) to rung or coil"
          >
            <span className={conv3On ? 'text-emerald-400 font-bold' : 'text-slate-400'}><span className="opacity-40">⠿ </span>CONV3 (O:0/3)</span>
          </div>

          {/* The Continuous Sheet / Strip (Fed continuously from decoiler) */}
          <div 
            className="absolute bottom-8 h-2 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-300 border-y border-white/40 shadow-sm flex items-center overflow-hidden"
            style={{ left: 0, width: toPct(uiState.stripX) }}
          >
            {/* Coil roll stripes on infeed */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_8px,rgba(255,255,255,0.12)_8px,rgba(255,255,255,0.12)_10px)] opacity-60" />
            {/* Leading cut edge highlight */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-300/80 shadow-[0_0_3px_#f59e0b]" />
          </div>

          {/* Cut Sheets on Conveyor */}
          {uiState.cutSheets.map(sheet => (
            <div 
              key={sheet.id}
              className="absolute bottom-8 h-2 bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-300 border border-cyan-400/80 rounded-[1px] shadow-md flex items-center justify-center overflow-hidden"
              style={{ left: toPct(sheet.tailX), width: toPct(sheet.headX - sheet.tailX) }}
              title={`Cut Sheet #${sheet.id + 1} (Length: ${Math.round(sheet.headX - sheet.tailX)}px)`}
            >
              <span className="text-[6.5px] font-mono font-bold text-cyan-950 select-none opacity-90 px-0.5 whitespace-nowrap">
                #{sheet.id + 1}
              </span>
            </div>
          ))}

          {/* Finished Parts Bin at the end of Conveyor 3 */}
          <div 
            className="absolute bottom-2 right-0 w-8 h-6 bg-slate-900 border-l border-t border-slate-700 rounded-tl flex flex-col items-center justify-center text-[7px] font-mono text-slate-400 z-10 shadow"
            title={`Collection bin: ${uiState.partsDropped} parts collected`}
          >
            <span className="text-[8px]">📥</span>
            <span className="font-bold text-amber-300">{uiState.partsDropped}</span>
          </div>

          {/* Photoelectric PROX Sensor Beam */}
          <div 
            className="absolute top-8 w-2 h-10 flex flex-col items-center pointer-events-none"
            style={{ left: toPct(PROX_X) }}
          >
            <div className={`w-3 h-3 rounded-full border ${
              uiState.sensors.PROX 
                ? 'bg-yellow-400 border-yellow-200 shadow-[0_0_8px_#eab308]' 
                : 'bg-yellow-900/60 border-yellow-700/50'
            }`} />
            {/* Optical beam down to strip */}
            <div className={`w-[1.5px] flex-1 transition-opacity ${
              uiState.sensors.PROX 
                ? 'bg-yellow-400 opacity-90 shadow-[0_0_6px_#eab308]' 
                : 'bg-yellow-500/30 opacity-40'
            }`} />
          </div>

          {/* Dynamic Cut Flash / Spark Effect */}
          {uiState.cutFlash > 0 && (
            <div 
              className="absolute bottom-8 z-30 pointer-events-none flex flex-col items-center -translate-x-1/2"
              style={{ left: toPct(SHEAR_X) }}
            >
              <div className="w-8 h-8 rounded-full bg-amber-400/80 blur-sm animate-ping" />
              <div className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#fbbf24]" />
              <span className="absolute -top-4 text-[9px] font-mono font-black text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] bg-slate-900/90 px-1 py-0.2 rounded border border-amber-400/80">
                ✂ CUT!
              </span>
            </div>
          )}

          {/* Hydraulic Shear Mechanism */}
          <div 
            className="absolute top-2 bottom-8 w-8 flex flex-col items-center z-10 pointer-events-none"
            style={{ left: `calc(${toPct(SHEAR_X)} - 16px)` }}
          >
            {/* Hydraulic Cylinder */}
            <div className={`w-7 h-9 rounded-t border flex flex-col items-center justify-center transition-colors shadow-md ${
              bladeDown 
                ? 'bg-amber-950/90 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.35)]' 
                : 'bg-slate-800 border-slate-600'
            }`}>
              <span className="text-[6.5px] font-mono font-bold text-amber-300">SHEAR</span>
              <span className="text-[5.5px] font-mono text-amber-400/80">O:0/2</span>
            </div>
            {/* Cylinder Rod: stroke extends from 8px up to 83px so blade edge contacts metal at 135px and cuts through to 143px */}
            <div 
              className="w-2 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 border-x border-slate-400 shadow-inner"
              style={{ height: `${8 + (uiState.bladeY * 0.75)}px` }}
            />
            {/* Shear Blade */}
            <div className={`w-9 h-4 border-b-2 shadow-lg relative rounded-b-[2px] transition-colors ${
              uiState.bladeY >= 92 
                ? 'bg-amber-200 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                : 'bg-gradient-to-b from-slate-300 to-slate-100 border-slate-500'
            }`}>
              {/* Beveled cutting chisel edge */}
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Operator Pushbuttons Section */}
      <section className="hardware-section" style={{ padding: '12px 14px' }}>
        <div className="hardware-section-heading" style={{ marginBottom: '10px' }}>
          <h4><SlidersHorizontal size={14} />Operator pushbuttons</h4>
          <span>INPUTS (I:0)</span>
        </div>

        <div className="io-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', maxWidth: '270px', margin: '0 auto' }}>
          {/* Start Pushbutton (I:0/0 N.O.) */}
          <div className={`io-cell ${isStartPressed ? 'active-cell' : ''}`} style={{ '--signal': '#10b981' }}>
            <span
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({
                  kind: 'io',
                  addr: 'I:0/0',
                  label: symbols?.['I:0/0'] || 'START_PB',
                  isOutput: false
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="io-address flex items-center gap-1 cursor-grab active:cursor-grabbing hover:text-cyan-300 hover:bg-cyan-950/40 px-1 py-0.5 rounded transition"
              title="Drag I:0/0 (START_PB) to rung or contact"
            >
              <span className="opacity-40 text-[9px]">⠿</span>I:0/0
            </span>
            <button
              className={`momentary-control ${isStartPressed ? 'pressed' : ''}`}
              aria-label="Start Pushbutton (N.O.)"
              aria-pressed={isStartPressed}
              title="START Pushbutton (I:0/0) — Normally Open. Press and hold"
              onPointerDown={e => {
                if (e.button !== undefined && e.button !== 0) return;
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                pressButton(e.pointerId, 'START');
              }}
              onPointerUp={e => releaseButton(e.pointerId, 'START')}
              onPointerCancel={e => releaseButton(e.pointerId, 'START')}
              onLostPointerCapture={e => releaseButton(e.pointerId, 'START')}
              onKeyDown={e => {
                if ([' ', 'Enter'].includes(e.key)) {
                  e.preventDefault();
                  if (!e.repeat) pressButton(`key_${e.key}`, 'START');
                }
              }}
              onKeyUp={e => {
                if ([' ', 'Enter'].includes(e.key)) {
                  e.preventDefault();
                  releaseButton(`key_${e.key}`, 'START');
                }
              }}
              onBlur={() => releaseButton(undefined, 'START')}
            >
              <span>START</span>
            </button>
            <span className="io-name">{symbols?.['I:0/0'] || 'Start (N.O.)'}</span>
            <span className={`io-value ${isStartPressed ? 'on' : ''}`}>
              <i />{isStartPressed ? 'Pressed' : 'Normal'}<b>{isStartPressed ? '1' : '0'}</b>
            </span>
          </div>

          {/* Stop Pushbutton (I:0/1 N.C.) */}
          <div className={`io-cell ${isStopPressed ? 'active-cell' : ''}`} style={{ '--signal': '#ef4444' }}>
            <span
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({
                  kind: 'io',
                  addr: 'I:0/1',
                  label: symbols?.['I:0/1'] || 'STOP_PB',
                  isOutput: false
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="io-address flex items-center gap-1 cursor-grab active:cursor-grabbing hover:text-cyan-300 hover:bg-cyan-950/40 px-1 py-0.5 rounded transition"
              title="Drag I:0/1 (STOP_PB) to rung or contact"
            >
              <span className="opacity-40 text-[9px]">⠿</span>I:0/1
            </span>
            <button
              className={`momentary-control ${isStopPressed ? 'pressed' : ''}`}
              aria-label="Stop Pushbutton (N.C.)"
              aria-pressed={isStopPressed}
              title="STOP Pushbutton (I:0/1) — Normally Closed. Press to break circuit"
              onPointerDown={e => {
                if (e.button !== undefined && e.button !== 0) return;
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                pressButton(e.pointerId, 'STOP');
              }}
              onPointerUp={e => releaseButton(e.pointerId, 'STOP')}
              onPointerCancel={e => releaseButton(e.pointerId, 'STOP')}
              onLostPointerCapture={e => releaseButton(e.pointerId, 'STOP')}
              onKeyDown={e => {
                if ([' ', 'Enter'].includes(e.key)) {
                  e.preventDefault();
                  if (!e.repeat) pressButton(`key_${e.key}`, 'STOP');
                }
              }}
              onKeyUp={e => {
                if ([' ', 'Enter'].includes(e.key)) {
                  e.preventDefault();
                  releaseButton(`key_${e.key}`, 'STOP');
                }
              }}
              onBlur={() => releaseButton(undefined, 'STOP')}
            >
              <span>STOP</span>
            </button>
            <span className="io-name">{symbols?.['I:0/1'] || 'Stop (N.C.)'}</span>
            <span className={`io-value ${isStopPressed ? 'on' : ''}`}>
              <i />{isStopPressed ? 'Pressed' : 'Normal'}<b>{isBitOn('I:0/1') ? '1' : '0'}</b>
            </span>
          </div>
        </div>
      </section>

      {/* 4. Live Image Table Snapshot */}
      <div className="hardware-data">
        <span><Activity size={14} />Live image</span>
        <code>I:0 <b>{[0,1,2,3,4].map(i => isBitOn(`I:0/${i}`) ? 1 : 0).join('')}</b></code>
        <code>O:0 <b>{[0,1,2,3].map(i => isBitOn(`O:0/${i}`) ? 1 : 0).join('')}</b></code>
      </div>
    </div>
  );
}

export default MetalShearSandbox;
