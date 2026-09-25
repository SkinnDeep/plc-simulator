import React, { useEffect, useState } from 'react';
import { Zap, Activity, CircleDot, Power } from 'lucide-react';

export function HardwareTrainer({ plcData, onToggleInput, isRunning }) {
  const isBitOn = (addr) => !!plcData?.bits?.[addr];
  const [activePress, setActivePress] = useState(null);

  // Global mouseup and touchend listeners ensure pushbuttons release cleanly even if user drags mouse away
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (activePress) {
        onToggleInput(activePress, false);
        setActivePress(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
  }, [activePress, onToggleInput]);

  const handlePressDown = (addr) => {
    setActivePress(addr);
    onToggleInput(addr, true);
  };

  const handlePressUp = (addr) => {
    if (activePress === addr) {
      setActivePress(null);
    }
    onToggleInput(addr, false);
  };

  // 4 Pilot Lamps
  const lamps = [
    {
      addr: 'O:0/0',
      label: 'Lamp 1',
      name: 'Amber',
      active: isBitOn('O:0/0'),
      onGlow: 'bg-amber-400 border-amber-300 shadow-[0_0_35px_#f59e0b,0_0_15px_#f59e0b]',
      offGlow: 'bg-amber-950/40 border-amber-900/60 text-amber-900',
      lightColor: '#f59e0b'
    },
    {
      addr: 'O:0/1',
      label: 'Lamp 2',
      name: 'Blue',
      active: isBitOn('O:0/1'),
      onGlow: 'bg-cyan-400 border-cyan-300 shadow-[0_0_35px_#06b6d4,0_0_15px_#06b6d4]',
      offGlow: 'bg-cyan-950/40 border-cyan-900/60 text-cyan-900',
      lightColor: '#06b6d4'
    },
    {
      addr: 'O:0/2',
      label: 'Lamp 3',
      name: 'Green',
      active: isBitOn('O:0/2'),
      onGlow: 'bg-emerald-400 border-emerald-300 shadow-[0_0_35px_#10b981,0_0_15px_#10b981]',
      offGlow: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-900',
      lightColor: '#10b981'
    },
    {
      addr: 'O:0/3',
      label: 'Lamp 4',
      name: 'Red',
      active: isBitOn('O:0/3'),
      onGlow: 'bg-red-500 border-red-300 shadow-[0_0_35px_#ef4444,0_0_15px_#ef4444]',
      offGlow: 'bg-red-950/40 border-red-900/60 text-red-900',
      lightColor: '#ef4444'
    }
  ];

  return (
    <div
      id="tour-trainer"
      className="bg-[#212328] border-2 border-[#3c414a] rounded-2xl p-4 shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col gap-4 select-none relative overflow-hidden"
    >
      {/* Subtle metallic gradient overlay for physical panel feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* 1. Header & Module Identification */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
            AB
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>MicroLogix 1000</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                TRAINER
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Physical I/O Hardware Console</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={isRunning ? 'text-emerald-400 font-bold' : 'text-slate-500 font-semibold'}>
            {isRunning ? 'RUN' : 'STOP'}
          </span>
        </div>
      </div>

      {/* 2. Outputs: 4 Industrial Pilot Lamps */}
      <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 mb-3">
          <span className="flex items-center gap-1.5">
            <CircleDot className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 font-bold">PILOT LAMPS (O:0)</span>
          </span>
          <span className="text-[10px] text-slate-500">O:0/0 — O:0/3</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {lamps.map((lamp) => (
            <div key={lamp.addr} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {lamp.addr}
              </span>

              {/* Realistic Pilot Light Lens */}
              <div
                className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all duration-150 relative ${
                  lamp.active ? lamp.onGlow : lamp.offGlow
                }`}
              >
                {/* Outer Bezel Reflection */}
                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                  {/* Inner Filament Core */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      lamp.active ? 'bg-white/90 shadow-[0_0_12px_#ffffff]' : 'bg-black/40'
                    }`}
                  >
                    {lamp.active && <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />}
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition ${
                  lamp.active
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-500'
                }`}
              >
                {lamp.active ? 'ON (1)' : 'OFF (0)'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">{lamp.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Inputs: 2 Toggle Switches & 2 Momentary Pushbuttons */}
      <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 mb-3">
          <span className="flex items-center gap-1.5">
            <Power className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-bold">INPUTS (I:0)</span>
          </span>
          <span className="text-[10px] text-cyan-400/80">Pushbuttons release on click release</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {/* I:0/0 Toggle Switch 1 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400">I:0/0</span>
            <button
              onClick={() => onToggleInput('I:0/0', !isBitOn('I:0/0'))}
              className={`w-12 h-16 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                isBitOn('I:0/0')
                  ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500'
              }`}
              title="Toggle Switch 1 (I:0/0) — Click to flip ON / OFF"
            >
              <span className={`text-[8px] font-mono font-bold ${isBitOn('I:0/0') ? 'text-emerald-400' : 'text-slate-600'}`}>
                ON
              </span>
              <div
                className={`w-4 h-6 rounded-md shadow transition-transform duration-150 ${
                  isBitOn('I:0/0') ? 'bg-emerald-400 -translate-y-1' : 'bg-slate-400 translate-y-1'
                }`}
              />
              <span className={`text-[8px] font-mono font-bold ${!isBitOn('I:0/0') ? 'text-slate-400' : 'text-slate-600'}`}>
                OFF
              </span>
            </button>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${isBitOn('I:0/0') ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isBitOn('I:0/0') ? '1' : '0'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Switch 1</span>
          </div>

          {/* I:0/1 Toggle Switch 2 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400">I:0/1</span>
            <button
              onClick={() => onToggleInput('I:0/1', !isBitOn('I:0/1'))}
              className={`w-12 h-16 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                isBitOn('I:0/1')
                  ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500'
              }`}
              title="Toggle Switch 2 (I:0/1) — Click to flip ON / OFF"
            >
              <span className={`text-[8px] font-mono font-bold ${isBitOn('I:0/1') ? 'text-emerald-400' : 'text-slate-600'}`}>
                ON
              </span>
              <div
                className={`w-4 h-6 rounded-md shadow transition-transform duration-150 ${
                  isBitOn('I:0/1') ? 'bg-emerald-400 -translate-y-1' : 'bg-slate-400 translate-y-1'
                }`}
              />
              <span className={`text-[8px] font-mono font-bold ${!isBitOn('I:0/1') ? 'text-slate-400' : 'text-slate-600'}`}>
                OFF
              </span>
            </button>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${isBitOn('I:0/1') ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isBitOn('I:0/1') ? '1' : '0'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Switch 2</span>
          </div>

          {/* I:0/2 Green Pushbutton (START) */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400">I:0/2</span>
            <button
              onMouseDown={() => handlePressDown('I:0/2')}
              onMouseUp={() => handlePressUp('I:0/2')}
              onMouseLeave={() => handlePressUp('I:0/2')}
              onTouchStart={() => handlePressDown('I:0/2')}
              onTouchEnd={() => handlePressUp('I:0/2')}
              className={`w-14 h-16 rounded-xl border-3 flex flex-col items-center justify-center p-1 transition-all cursor-pointer select-none active:scale-95 ${
                isBitOn('I:0/2')
                  ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_20px_#10b981] translate-y-1'
                  : 'bg-emerald-900 border-emerald-700 hover:border-emerald-500 shadow-md'
              }`}
              title="Green Momentary Button (I:0/2) — Press & Hold"
            >
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400/80 bg-emerald-600 flex items-center justify-center shadow-inner">
                <span className="text-[9px] font-mono font-extrabold text-white">START</span>
              </div>
            </button>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${isBitOn('I:0/2') ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isBitOn('I:0/2') ? 'PRESSED' : '0'}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Green PB</span>
          </div>

          {/* I:0/3 Red Pushbutton (STOP) */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400">I:0/3</span>
            <button
              onMouseDown={() => handlePressDown('I:0/3')}
              onMouseUp={() => handlePressUp('I:0/3')}
              onMouseLeave={() => handlePressUp('I:0/3')}
              onTouchStart={() => handlePressDown('I:0/3')}
              onTouchEnd={() => handlePressUp('I:0/3')}
              className={`w-14 h-16 rounded-xl border-3 flex flex-col items-center justify-center p-1 transition-all cursor-pointer select-none active:scale-95 ${
                isBitOn('I:0/3')
                  ? 'bg-red-500 border-red-300 shadow-[0_0_20px_#ef4444] translate-y-1'
                  : 'bg-red-950 border-red-800 hover:border-red-600 shadow-md'
              }`}
              title="Red Momentary Button (I:0/3) — Press & Hold"
            >
              <div className="w-8 h-8 rounded-full border-2 border-red-400/80 bg-red-700 flex items-center justify-center shadow-inner">
                <span className="text-[9px] font-mono font-extrabold text-white">STOP</span>
              </div>
            </button>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${isBitOn('I:0/3') ? 'text-red-400' : 'text-slate-500'}`}>
              {isBitOn('I:0/3') ? 'PRESSED' : '0'}
            </span>
            <span className="text-[10px] text-red-400 font-medium">Red PB</span>
          </div>
        </div>
      </div>

      {/* 4. Live Image Table Snapshot */}
      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[10px] font-mono flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-300">DATA TABLE:</span>
        </div>
        <div className="flex items-center gap-3">
          <span>I:0 = [0..3: {['I:0/0','I:0/1','I:0/2','I:0/3'].map(a => isBitOn(a) ? '1' : '0').join('')}]</span>
          <span>O:0 = [0..3: {['O:0/0','O:0/1','O:0/2','O:0/3'].map(a => isBitOn(a) ? '1' : '0').join('')}]</span>
        </div>
      </div>
    </div>
  );
}
export default HardwareTrainer;
