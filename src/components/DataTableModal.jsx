import React, { useState } from 'react';
import { Database, X, RefreshCw, Edit3 } from 'lucide-react';

export function DataTableModal({ isOpen, onClose, plcData, onUpdateRegister }) {
  const [selectedFile, setSelectedFile] = useState('N7'); // 'O0', 'I1', 'S2', 'B3', 'T4', 'N7'

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm text-white">RSLogix 500 Data Table Monitor</span>
            <span className="text-xs text-slate-500 font-mono">MicroLogix 1000 Memory Map</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File Tabs */}
        <div className="flex bg-slate-950/50 border-b border-slate-800 px-3 overflow-x-auto text-xs font-mono">
          {[
            { id: 'O0', label: 'O0 - OUTPUT' },
            { id: 'I1', label: 'I1 - INPUT' },
            { id: 'S2', label: 'S2 - STATUS' },
            { id: 'B3', label: 'B3 - BINARY' },
            { id: 'T4', label: 'T4 - TIMER' },
            { id: 'N7', label: 'N7 - INTEGER' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedFile(tab.id)}
              className={`px-3 py-2 border-b-2 font-medium transition whitespace-nowrap ${
                selectedFile === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* N7 Integer File */}
          {selectedFile === 'N7' && (
            <div>
              <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
                <span>Integer File N7 (Radix: Decimal). Click any value to override it live in PLC memory.</span>
                <span className="text-[10px] text-cyan-400 font-mono">N7:1 is currently {plcData.N7[1]}</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 font-mono text-xs">
                {plcData.N7.slice(0, 16).map((val, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border flex flex-col items-center justify-center transition ${
                      idx === 1
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500">N7:{idx}</span>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => onUpdateRegister(`N7:${idx}`, parseInt(e.target.value, 10) || 0)}
                      className="w-12 text-center bg-transparent border-b border-transparent focus:border-cyan-400 focus:outline-none font-bold text-sm text-cyan-300 mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* T4 Timers */}
          {selectedFile === 'T4' && (
            <div className="overflow-x-auto font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-3">Address</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">EN</th>
                    <th className="py-2 px-3">TT</th>
                    <th className="py-2 px-3">DN</th>
                    <th className="py-2 px-3">Base</th>
                    <th className="py-2 px-3">PRE (s)</th>
                    <th className="py-2 px-3">ACC (s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {plcData.T4.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-bold text-cyan-400">{t.id}</td>
                      <td className="py-2 px-3 text-slate-400">{t.type}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.EN ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-600'}`}>
                          {t.EN ? '1' : '0'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.TT ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-600'}`}>
                          {t.TT ? '1' : '0'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.DN ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-600'}`}>
                          {t.DN ? '1' : '0'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{t.timeBase}</td>
                      <td className="py-2 px-3 text-amber-300 font-bold">{t.PRE}</td>
                      <td className="py-2 px-3 text-emerald-300 font-bold">
                        {Number(t.ACC || 0).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* O0 Outputs */}
          {selectedFile === 'O0' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              {Object.entries(plcData.O).map(([key, val]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    val ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <span className="font-bold text-slate-300">O:0/{key}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    val ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {val ? 'ENERGIZED (1)' : 'OFF (0)'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* I1 Inputs */}
          {selectedFile === 'I1' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              {Object.entries(plcData.I).map(([key, val]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    val ? 'border-emerald-500 bg-emerald-950/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <span className="font-bold text-slate-300">I:0/{key}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    val ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {val ? 'CLOSED (1)' : 'OPEN (0)'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* B3 Binary Internal Relays */}
          {selectedFile === 'B3' && (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 font-mono text-xs">
              {Object.entries(plcData.B3).map(([key, val]) => (
                <div
                  key={key}
                  className={`p-2 rounded border flex flex-col items-center ${
                    val ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300' : 'border-slate-800 bg-slate-950/50 text-slate-500'
                  }`}
                >
                  <span className="text-[10px]">B3:0/{key}</span>
                  <span className="font-bold text-sm mt-1">{val ? '1' : '0'}</span>
                </div>
              ))}
            </div>
          )}

          {/* S2 Status */}
          {selectedFile === 'S2' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">S:1/15 First Pass Bit</span>
                  <span className="text-cyan-400 font-bold text-sm">{plcData.S2.firstPass ? 'TRUE (1)' : 'FALSE (0)'}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">S:4 Total Scans</span>
                  <span className="text-emerald-400 font-bold text-sm">{plcData.S2.scanCount}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Scan Execution Time</span>
                  <span className="text-amber-400 font-bold text-sm">{plcData.S2.lastScanMs} ms</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            Close Data Files
          </button>
        </div>
      </div>
    </div>
  );
}
