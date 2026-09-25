import React, { useState, useEffect, useRef } from 'react';
import { X, Search, RotateCcw, Activity, ToggleLeft, ToggleRight, Database } from 'lucide-react';

export function BitMonitorDrawer({
  isOpen,
  onClose,
  plcData,
  onToggleInput,
  onSetRegister
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'inputs' | 'outputs' | 'b3' | 't4' | 'n7'
  const [filterText, setFilterText] = useState('');
  const drawerRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    drawerRef.current?.querySelector('button')?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...drawerRef.current.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;

  const bits = plcData?.bits || {};
  const T4 = plcData?.T4 || [];
  const N7 = plcData?.N7 || [];

  // Descriptive labels
  const INPUT_LABELS = {
    'I:0/0': 'Switch 1 (Toggle)',
    'I:0/1': 'Switch 2 (Toggle)',
    'I:0/2': 'Green Pushbutton (PB1)',
    'I:0/3': 'Red Pushbutton (PB2)',
    'I:0/4': 'Aux Input 4',
    'I:0/5': 'Aux Input 5',
    'I:0/6': 'Aux Input 6',
    'I:0/7': 'Aux Input 7'
  };

  const OUTPUT_LABELS = {
    'O:0/0': 'Amber Lamp 1',
    'O:0/1': 'Blue Lamp 2',
    'O:0/2': 'Green Lamp 3',
    'O:0/3': 'Red Lamp 4',
    'O:0/4': 'Solenoid 5',
    'O:0/5': 'Motor Contactor 6',
    'O:0/6': 'Aux Output 7',
    'O:0/7': 'Alarm Horn 8'
  };

  const inputList = Array.from({ length: 8 }, (_, i) => {
    const addr = `I:0/${i}`;
    return {
      addr,
      name: INPUT_LABELS[addr] || `Input bit ${i}`,
      val: !!bits[addr],
      type: 'input'
    };
  });

  const outputList = Array.from({ length: 8 }, (_, i) => {
    const addr = `O:0/${i}`;
    return {
      addr,
      name: OUTPUT_LABELS[addr] || `Output bit ${i}`,
      val: !!bits[addr],
      type: 'output'
    };
  });

  const b3List = Array.from({ length: 16 }, (_, i) => {
    const addr = `B3:0/${i}`;
    return {
      addr,
      name: `Internal Relay B3:0/${i}`,
      val: !!bits[addr],
      type: 'b3'
    };
  });

  const filteredInputs = inputList.filter(item =>
    item.addr.toLowerCase().includes(filterText.toLowerCase()) ||
    item.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredOutputs = outputList.filter(item =>
    item.addr.toLowerCase().includes(filterText.toLowerCase()) ||
    item.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredB3 = b3List.filter(item =>
    item.addr.toLowerCase().includes(filterText.toLowerCase()) ||
    item.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <aside
      aria-label="PLC Data Table and Bit Monitor"
      ref={drawerRef} id="bit-monitor" role="dialog" aria-label="Data Table Monitor"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl flex flex-col text-slate-100 transition-transform duration-200 ease-in-out font-sans"
    >
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Data Table Monitor</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                LIVE 1/0
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">RSLogix 500 Bit & Register Watch</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Close Bit Monitor (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter & Category Selector */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            aria-label="Search addresses"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search address (e.g. I:0/0, O:0, N7:1)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-semibold">
          {[
            { id: 'all', label: 'All' },
            { id: 'inputs', label: 'I:0 Inputs' },
            { id: 'outputs', label: 'O:0 Outputs' },
            { id: 'b3', label: 'B3 Binary' },
            { id: 't4', label: 'T4 Timers' },
            { id: 'n7', label: 'N7 Integers' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Watch List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. INPUTS (I:0) */}
        {(activeTab === 'all' || activeTab === 'inputs') && filteredInputs.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>I1 - Input Image Table (I:0)</span>
              <span className="text-[10px] font-mono text-slate-500">Click to Toggle</span>
            </div>
            <div className="space-y-1">
              {filteredInputs.map(item => (
                <div
                  key={item.addr}
                  onClick={() => onToggleInput && onToggleInput(item.addr, !item.val)}
                  role="button" tabIndex={0} aria-label={item.name} aria-pressed={item.val}
                  onKeyDown={(e) => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); onToggleInput?.(item.addr, !item.val); } }}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    item.val
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300 w-12">{item.addr}</span>
                    <span className="text-xs text-slate-300 truncate max-w-[190px]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold ${
                      item.val ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {item.val ? '1 (ON)' : '0 (OFF)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. OUTPUTS (O:0) */}
        {(activeTab === 'all' || activeTab === 'outputs') && filteredOutputs.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>O0 - Output Image Table (O:0)</span>
              <span className="text-[10px] font-mono text-slate-500">Coil / Lamp</span>
            </div>
            <div className="space-y-1">
              {filteredOutputs.map(item => (
                <div
                  key={item.addr}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border transition ${
                    item.val
                      ? 'bg-amber-950/60 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-300 w-12">{item.addr}</span>
                    <span className="text-xs text-slate-300 truncate max-w-[190px]">{item.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold ${
                    item.val ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.val ? '1 (ON)' : '0 (OFF)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. INTERNAL RELAYS (B3:0) */}
        {(activeTab === 'all' || activeTab === 'b3') && filteredB3.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>B3 - Internal Binary Flags (B3:0)</span>
              <span className="text-[10px] font-mono text-slate-500">16 Bits</span>
            </div>
            {/* 16-bit word grid visualization */}
            <div className="grid grid-cols-8 gap-1 p-2 rounded-lg bg-slate-950 border border-slate-800">
              {b3List.map(b => (
                <div
                  key={b.addr}
                  title={`${b.addr}: ${b.val ? '1' : '0'}`}
                  className={`text-center py-1 rounded text-[11px] font-mono font-bold transition ${
                    b.val
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-600 border border-slate-800'
                  }`}
                >
                  {b.val ? '1' : '0'}
                </div>
              ))}
            </div>
            {/* List */}
            <div className="space-y-1 pt-1">
              {filteredB3.map(item => (
                <div
                  key={item.addr}
                  className={`flex items-center justify-between px-3 py-1 rounded-lg border text-xs font-mono transition ${
                    item.val
                      ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold text-blue-400">{item.addr}</span>
                  <span className={`px-2 py-0.2 rounded text-[11px] font-bold ${
                    item.val ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.val ? '1' : '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. TIMERS (T4) */}
        {(activeTab === 'all' || activeTab === 't4') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>T4 - Timers Table</span>
              <span className="text-[10px] font-mono text-slate-500">EN / TT / DN / ACC</span>
            </div>
            <div className="space-y-2">
              {T4.slice(0, 5).map(timer => {
                const pre = timer.PRE || 1;
                const acc = timer.ACC || 0;
                const pct = Math.min(100, Math.round((acc / pre) * 100));

                return (
                  <div
                    key={timer.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-300">{timer.id}</span>
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${timer.EN ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                          EN: {timer.EN ? '1' : '0'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${timer.TT ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                          TT: {timer.TT ? '1' : '0'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${timer.DN ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          DN: {timer.DN ? '1' : '0'}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className="bg-purple-500 h-full transition-all duration-100"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>PRE: <b className="text-slate-200">{pre}s</b></span>
                      <span>ACC: <b className="text-cyan-300">{acc.toFixed(1)}s</b> ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. INTEGER REGISTERS (N7) */}
        {(activeTab === 'all' || activeTab === 'n7') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>N7 - Integer Registers (Math & Counts)</span>
              <span className="text-[10px] font-mono text-slate-500">Live Values</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {N7.slice(0, 8).map((val, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-xs font-mono font-bold text-indigo-400">N7:{idx}</span>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10) || 0;
                      if (onSetRegister) onSetRegister(`N7:${idx}`, num);
                    }}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-mono text-cyan-400">Scan: {plcData?.S2?.scanCount || 0} cycles</span>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer transition"
        >
          Close Drawer
        </button>
      </div>
    </aside>
  );
}
export default BitMonitorDrawer;
