import React from 'react';
import { Activity, Clock, Cpu, ArrowRight } from 'lucide-react';

export function ScanCycleVisualizer({ scanResult, isRunning, scanPeriodMs, onPeriodChange }) {
  const scanTimeMs = scanResult?.scanTimeMs || 0.4;
  const scanCount = scanResult?.scanCount || 0;

  const phases = [
    { id: 'overhead', name: '1. Overhead & Diagnostics', desc: 'Checks I/O integrity, verifies program logic, checks communication', color: 'border-blue-500 text-blue-400 bg-blue-950/30' },
    { id: 'input', name: '2. Input Scan', desc: 'Reads all physical switches and buttons into input image memory table (I:0)', color: 'border-emerald-500 text-emerald-400 bg-emerald-950/30' },
    { id: 'logic', name: '3. Logic Execution', desc: 'Scans ladder rungs 0000 to end, evaluates conditions, calculates coils & timers', color: 'border-cyan-500 text-cyan-400 bg-cyan-950/30' },
    { id: 'output', name: '4. Output Scan', desc: 'Transfers output image table (O:0) to physical pilot lamps and actuators', color: 'border-amber-500 text-amber-400 bg-amber-950/30' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-200">PLC Scan Cycle Architecture (Slide 23)</h3>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            {isRunning ? 'CYCLING' : 'STOPPED'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scan Time: <strong className="text-cyan-300">{scanTimeMs} ms</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Speed:</span>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={scanPeriodMs}
              onChange={(e) => onPeriodChange(parseInt(e.target.value, 10))}
              className="w-24 accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <span className="text-[11px] text-slate-400 w-12">{scanPeriodMs}ms</span>
          </div>
        </div>
      </div>

      {/* 4 Phases Flowchart */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {phases.map((phase, idx) => (
          <div
            key={phase.id}
            className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${phase.color} ${
              isRunning ? 'ring-1 ring-white/10' : 'opacity-85'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs">{phase.name}</span>
                <span className="text-[9px] font-mono opacity-60">PHASE {idx + 1}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">{phase.desc}</p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">Total Scans:</span>
              <span className="font-bold text-white">{scanCount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
