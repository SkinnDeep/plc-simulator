import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, GitFork, X, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { InstructionPalette } from './InstructionPalette';
import { validateLadderLogic } from '../engine/plcValidator';

const COMMON_ADDRESS_OPTIONS = [
  { group: 'Inputs (Switches & Buttons)', items: [
    { addr: 'I:0/0', label: 'Switch 1', desc: 'Toggle Switch 1' },
    { addr: 'I:0/1', label: 'Switch 2', desc: 'Toggle Switch 2' },
    { addr: 'I:0/2', label: 'Green PB', desc: 'Start Pushbutton (PB1)' },
    { addr: 'I:0/3', label: 'Red PB', desc: 'Stop Pushbutton (PB2)' }
  ]},
  { group: 'Outputs (Pilot Lamps)', items: [
    { addr: 'O:0/0', label: 'Amber Lamp', desc: 'Pilot Lamp 1' },
    { addr: 'O:0/1', label: 'Blue Lamp', desc: 'Pilot Lamp 2' },
    { addr: 'O:0/2', label: 'Green Lamp', desc: 'Pilot Lamp 3' },
    { addr: 'O:0/3', label: 'Red Lamp', desc: 'Pilot Lamp 4' }
  ]},
  { group: 'Internal Relays (B3)', items: [
    { addr: 'B3:0/0', label: 'Internal Bit 0', desc: 'Relay Flag 0' },
    { addr: 'B3:0/1', label: 'Internal Bit 1', desc: 'Relay Flag 1' },
    { addr: 'B3:0/2', label: 'Internal Bit 2', desc: 'Relay Flag 2' }
  ]},
  { group: 'Timers & Registers', items: [
    { addr: 'T4:0', label: 'Timer T4:0', desc: 'Timer Block 0' },
    { addr: 'T4:1', label: 'Timer T4:1', desc: 'Timer Block 1' },
    { addr: 'T4:0.DN', label: 'T4:0 Done', desc: 'Timer 0 Done Bit' },
    { addr: 'T4:0.TT', label: 'T4:0 Timing', desc: 'Timer 0 Timing Bit' },
    { addr: 'T4:0.EN', label: 'T4:0 Enable', desc: 'Timer 0 Enable Bit' },
    { addr: 'N7:1', label: 'N7:1 Step', desc: 'Sequence Step Register' }
  ]}
];

export function LadderEditor({
  rungs,
  onChangeRungs,
  scanResult,
  plcData
}) {
  const [selectedRungIdx, setSelectedRungIdx] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [addressPickerTarget, setAddressPickerTarget] = useState(null); // { rungIdx, itemId }

  // Diagnostics validation
  const logicIssues = validateLadderLogic(rungs);
  const hasErrors = logicIssues.some(i => i.severity === 'error');

  const isElementActive = (rungId, elemId) => {
    if (!scanResult?.rungEvaluations) return false;
    const rEval = scanResult.rungEvaluations.find(r => r.rungId === rungId);
    return !!rEval?.elements?.[elemId]?.active;
  };

  const isRungActive = (rungId) => {
    if (!scanResult?.rungEvaluations) return false;
    const rEval = scanResult.rungEvaluations.find(r => r.rungId === rungId);
    return !!rEval?.rungActive;
  };

  // Add new blank rung
  const handleAddRung = () => {
    const newId = `r_${Date.now()}`;
    const nextIdx = rungs.length;
    const newRung = {
      id: newId,
      comment: `Rung ${String(nextIdx).padStart(3, '0')}: Control Logic`,
      items: []
    };
    const next = [...rungs, newRung];
    onChangeRungs(next);
    setSelectedRungIdx(next.length - 1);
    setSelectedItemId(null);
  };

  // Delete rung
  const handleDeleteRung = (idx) => {
    if (rungs.length <= 1) return;
    const next = rungs.filter((_, i) => i !== idx);
    onChangeRungs(next);
    setSelectedRungIdx(Math.max(0, idx - 1));
    setSelectedItemId(null);
  };

  const isOutputInstruction = (type) => ['OTE', 'OTL', 'OTU', 'TON', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(type);

  // Add instruction (from palette click or drop)
  const handleAddInstructionToRung = (rungIdx, type, defaultAddr = null) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const isOutput = isOutputInstruction(type);
    let operand = defaultAddr;
    if (!operand) {
      if (['ADD', 'SUB', 'MUL', 'DIV', 'MOV'].includes(type)) {
        operand = 'N7:0';
      } else if (type === 'TON' || type === 'RES') {
        operand = 'T4:0';
      } else {
        operand = isOutput ? 'O:0/0' : 'I:0/0';
      }
    }

    let params = {};
    if (type === 'TON') params = { pre: 2.0, timeBase: 1.0 };
    else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(type)) {
      params = { sourceA: 'N7:0', sourceB: '1', dest: 'N7:1' };
    } else if (type === 'MOV') {
      params = { source: 'N7:0', dest: 'N7:1' };
    }

    const newItem = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      operand,
      params,
      desc: isOutput ? 'Output / Compute' : 'Input Contact'
    };

    const nextItems = [...rung.items];
    if (isOutput) {
      nextItems.push(newItem);
    } else {
      // Insert contact before outputs if any exist
      const firstOutIdx = nextItems.findIndex(it => isOutputInstruction(it.type));
      if (firstOutIdx >= 0) {
        nextItems.splice(firstOutIdx, 0, newItem);
      } else {
        nextItems.push(newItem);
      }
    }

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: nextItems };
    onChangeRungs(nextRungs);
    setSelectedItemId(newItem.id);
  };

  // Add parallel branch block to rung
  const handleAddBranchToRung = (rungIdx) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const branchId = `branch_${Date.now()}`;
    const newBranch = {
      id: branchId,
      type: 'BRANCH',
      branches: [
        [{ id: `b1_${Date.now()}`, type: 'XIC', operand: 'I:0/2', desc: 'Start PB' }],
        [{ id: `b2_${Date.now()}`, type: 'XIC', operand: 'O:0/0', desc: 'Seal-In' }]
      ]
    };

    const nextItems = [...rung.items];
    const firstOutIdx = nextItems.findIndex(it => isOutputInstruction(it.type));
    if (firstOutIdx >= 0) {
      nextItems.splice(firstOutIdx, 0, newBranch);
    } else {
      nextItems.push(newBranch);
    }

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: nextItems };
    onChangeRungs(nextRungs);
    setSelectedItemId(branchId);
  };

  // Wrap a specific contact into a parallel branch
  const handleBranchAroundItem = (rungIdx, targetItemId) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const wrapList = (list) => {
      const out = [];
      for (const it of list) {
        if (it.id === targetItemId) {
          const branchId = `branch_${Date.now()}`;
          const newParallelContact = {
            id: `b_sub_${Date.now()}`,
            type: 'XIC',
            operand: 'O:0/0',
            desc: 'Seal-In'
          };
          out.push({
            id: branchId,
            type: 'BRANCH',
            branches: [
              [it],
              [newParallelContact]
            ]
          });
        } else if (it.type === 'BRANCH' || it.type === 'SPLIT') {
          out.push({
            ...it,
            branches: it.branches.map(wrapList)
          });
        } else {
          out.push(it);
        }
      }
      return out;
    };

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: wrapList(rung.items) };
    onChangeRungs(nextRungs);
  };

  // Add contact inside a branch path
  const handleAddContactToBranchPath = (rungIdx, branchId, pathIdx, addr = 'I:0/0') => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const newId = `bElem_${Date.now()}`;
    const newItem = { id: newId, type: 'XIC', operand: addr, desc: 'Contact' };

    const updateList = (list) => {
      return list.map(it => {
        if (it.id === branchId) {
          const nextBranches = it.branches.map((p, pI) => pI === pathIdx ? [...p, newItem] : p);
          return { ...it, branches: nextBranches };
        }
        if (it.type === 'BRANCH' || it.type === 'SPLIT') {
          return { ...it, branches: it.branches.map(updateList) };
        }
        return it;
      });
    };

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: updateList(rung.items) };
    onChangeRungs(nextRungs);
    setSelectedItemId(newId);
  };

  // Add an additional parallel path level to a branch
  const handleAddLevelToBranch = (rungIdx, branchId) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const newId = `bElem_${Date.now()}`;
    const newItem = { id: newId, type: 'XIC', operand: 'I:0/1', desc: 'Alternate' };

    const updateList = (list) => {
      return list.map(it => {
        if (it.id === branchId) {
          return { ...it, branches: [...it.branches, [newItem]] };
        }
        if (it.type === 'BRANCH' || it.type === 'SPLIT') {
          return { ...it, branches: it.branches.map(updateList) };
        }
        return it;
      });
    };

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: updateList(rung.items) };
    onChangeRungs(nextRungs);
  };

  // Delete an item or branch
  const handleDeleteItem = (rungIdx, itemId) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const filterList = (list) => {
      return list
        .filter(it => it.id !== itemId)
        .map(it => {
          if (it.type === 'BRANCH' || it.type === 'SPLIT') {
            return {
              ...it,
              branches: it.branches.map(filterList)
            };
          }
          return it;
        });
    };

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: filterList(rung.items) };
    onChangeRungs(nextRungs);
    setSelectedItemId(null);
  };

  // Update item (operand, type, params)
  const handleUpdateItem = (rungIdx, itemId, updates) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const updateList = (list) => {
      return list.map(it => {
        if (it.id === itemId) return { ...it, ...updates };
        if (it.type === 'BRANCH' || it.type === 'SPLIT') {
          return { ...it, branches: it.branches.map(updateList) };
        }
        return it;
      });
    };

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: updateList(rung.items) };
    onChangeRungs(nextRungs);
  };

  // When user clicks an I/O token in the palette
  const handlePaletteSelectIo = (addr, isOutput) => {
    if (selectedItemId) {
      handleUpdateItem(selectedRungIdx, selectedItemId, { operand: addr });
    } else {
      handleAddInstructionToRung(selectedRungIdx, isOutput ? 'OTE' : 'XIC', addr);
    }
  };

  // ========================================================
  // DRAG & DROP HANDLERS
  // ========================================================
  const handleDropOnElement = (e, rungIdx, targetItemId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.kind === 'io') {
        handleUpdateItem(rungIdx, targetItemId, { operand: data.addr });
      } else if (data.kind === 'instruction') {
        if (data.isBranch || data.type === 'BRANCH' || data.type === 'SPLIT') {
          handleBranchAroundItem(rungIdx, targetItemId);
        } else {
          handleUpdateItem(rungIdx, targetItemId, { type: data.type });
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleDropOnRungZone = (e, rungIdx, zoneType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.kind === 'instruction') {
        if (data.isBranch || data.type === 'BRANCH' || data.type === 'SPLIT') {
          handleAddBranchToRung(rungIdx);
        } else {
          handleAddInstructionToRung(rungIdx, data.type);
        }
      } else if (data.kind === 'io') {
        if (zoneType === 'output' || data.isOutput) {
          handleAddInstructionToRung(rungIdx, 'OTE', data.addr);
        } else {
          handleAddInstructionToRung(rungIdx, 'XIC', data.addr);
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Helper to find an item recursively in a rung's items hierarchy
  const findItemRecursive = (items, itemId) => {
    for (const it of items) {
      if (it.id === itemId) return it;
      if (it.type === 'BRANCH' || it.type === 'SPLIT') {
        for (const branch of (it.branches || [])) {
          const found = findItemRecursive(branch, itemId);
          if (found) return found;
        }
      }
    }
    return null;
  };

  // Helper to clone an item or branch with brand new unique IDs
  const cloneItemWithNewIds = (item) => {
    if (!item) return null;
    const newId = `elem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    if (item.type === 'BRANCH' || item.type === 'SPLIT') {
      return {
        ...item,
        id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        branches: (item.branches || []).map(branch =>
          branch.map(sub => cloneItemWithNewIds(sub)).filter(Boolean)
        )
      };
    }
    return {
      ...item,
      id: newId
    };
  };

  // Helper to clone a rung with new IDs
  const cloneRungWithNewIds = (rung, newIndex) => {
    return {
      id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      comment: `Rung ${String(newIndex).padStart(3, '0')}: (Copy) ${rung.comment ? rung.comment.replace(/^Rung \d+:\s*/, '') : 'Logic'}`,
      items: (rung.items || []).map(cloneItemWithNewIds).filter(Boolean)
    };
  };

  // Keyboard shortcut listener (Delete, Backspace, Ctrl+C, Ctrl+X, Ctrl+V)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedItemId) {
          handleDeleteItem(selectedRungIdx, selectedItemId);
        } else if (rungs.length > 1) {
          handleDeleteRung(selectedRungIdx);
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl + C (Copy)
      if (cmdOrCtrl && (e.key === 'c' || e.key === 'C')) {
        const currRung = rungs[selectedRungIdx];
        if (selectedItemId && currRung) {
          const found = findItemRecursive(currRung.items || [], selectedItemId);
          if (found) {
            setClipboard({ kind: 'item', data: JSON.parse(JSON.stringify(found)) });
          }
        } else if (currRung) {
          setClipboard({ kind: 'rung', data: JSON.parse(JSON.stringify(currRung)) });
        }
        return;
      }

      // Ctrl + X (Cut)
      if (cmdOrCtrl && (e.key === 'x' || e.key === 'X')) {
        const currRung = rungs[selectedRungIdx];
        if (selectedItemId && currRung) {
          const found = findItemRecursive(currRung.items || [], selectedItemId);
          if (found) {
            setClipboard({ kind: 'item', data: JSON.parse(JSON.stringify(found)) });
            handleDeleteItem(selectedRungIdx, selectedItemId);
          }
        } else if (currRung && rungs.length > 1) {
          setClipboard({ kind: 'rung', data: JSON.parse(JSON.stringify(currRung)) });
          handleDeleteRung(selectedRungIdx);
        }
        return;
      }

      // Ctrl + V (Paste)
      if (cmdOrCtrl && (e.key === 'v' || e.key === 'V')) {
        if (!clipboard) return;

        if (clipboard.kind === 'item') {
          const currRung = rungs[selectedRungIdx];
          if (!currRung) return;
          const cloned = cloneItemWithNewIds(clipboard.data);
          const nextItems = [...(currRung.items || [])];
          const isOut = isOutputInstruction(cloned.type);
          if (isOut) {
            nextItems.push(cloned);
          } else {
            const firstOut = nextItems.findIndex(it => isOutputInstruction(it.type));
            if (firstOut >= 0) nextItems.splice(firstOut, 0, cloned);
            else nextItems.push(cloned);
          }
          const nextRungs = [...rungs];
          nextRungs[selectedRungIdx] = { ...currRung, items: nextItems };
          onChangeRungs(nextRungs);
          setSelectedItemId(cloned.id);
        } else if (clipboard.kind === 'rung') {
          const newRung = cloneRungWithNewIds(clipboard.data, selectedRungIdx + 1);
          const nextRungs = [...rungs];
          nextRungs.splice(selectedRungIdx + 1, 0, newRung);
          onChangeRungs(nextRungs);
          setSelectedRungIdx(selectedRungIdx + 1);
          setSelectedItemId(null);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, selectedRungIdx, rungs, clipboard]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col flex-1 focus:outline-none">
      {/* 1. Categorized Instruction & I/O Palette */}
      <InstructionPalette
        onAddInstruction={(type) => handleAddInstructionToRung(selectedRungIdx, type)}
        onAddBranch={() => handleAddBranchToRung(selectedRungIdx)}
        onSelectIoToken={handlePaletteSelectIo}
        hasSelection={!!selectedItemId}
      />

      {/* 2. Canvas Header Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
            Ladder Logic Canvas
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {rungs.length} {rungs.length === 1 ? 'Rung' : 'Rungs'}
          </span>
          {hasErrors ? (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Logic Warning</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Verified OK</span>
            </span>
          )}
        </div>

        {/* Prominent Add Rung Button */}
        <button
          id="tour-add-rung"
          onClick={handleAddRung}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          title="Add a new blank rung to the ladder program"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Rung</span>
        </button>
      </div>

      {/* 3. Ladder Rungs Canvas Container */}
      <div id="tour-rungs" className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/60">
        {rungs.map((rung, rIdx) => {
          const isRungSelected = selectedRungIdx === rIdx;
          const conducting = isRungActive(rung.id);
          const inputItems = rung.items.filter(it => !isOutputInstruction(it.type));
          const outputItems = rung.items.filter(it => isOutputInstruction(it.type));

          return (
            <div
              key={rung.id}
              onClick={() => { setSelectedRungIdx(rIdx); setSelectedItemId(null); }}
              className={`rounded-2xl border-2 p-3.5 transition-all cursor-pointer ${
                isRungSelected
                  ? 'border-cyan-500/80 bg-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  : conducting
                    ? 'border-emerald-500/60 bg-slate-900/80'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              {/* Rung Header */}
              <div className="flex items-center justify-between text-xs pb-2 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                    isRungSelected
                      ? 'bg-cyan-500 text-slate-950'
                      : conducting
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    RUNG {String(rIdx).padStart(3, '0')}
                  </span>
                  <input
                    type="text"
                    value={rung.comment || ''}
                    placeholder="Enter rung description comment..."
                    onChange={(e) => {
                      const next = [...rungs];
                      next[rIdx] = { ...rung, comment: e.target.value };
                      onChangeRungs(next);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none text-slate-300 text-xs px-1 py-0.5 transition font-medium w-72 max-w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                    conducting ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-500'
                  }`}>
                    {conducting ? 'POWER: TRUE' : 'FALSE'}
                  </span>
                  {rungs.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRung(rIdx); }}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
                      title="Delete Rung (Del)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Rung Schematic Line */}
              <div className="flex items-center gap-3 relative py-2 min-h-[90px]">
                {/* L1 Power Rail (Left) */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-2.5 h-24 rounded-full transition-all duration-150 ${
                    conducting ? 'bg-emerald-400 shadow-[0_0_12px_#10b981]' : 'bg-blue-600'
                  }`} />
                  <span className="text-[10px] font-mono font-bold text-blue-400 mt-1">L1</span>
                </div>

                {/* Conductor & Instruction Wire Area */}
                <div className="flex-1 flex items-center justify-between px-2 relative min-h-[90px] overflow-x-auto">
                  {/* Background Conductor Wire */}
                  <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 transition-all duration-150 ${
                    conducting ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'
                  }`} />

                  {/* Left Side: Inputs & Parallel Branches */}
                  <div className="flex items-center gap-3 relative z-10 flex-wrap py-2">
                    {inputItems.map(item => {
                      if (item.type === 'BRANCH' || item.type === 'SPLIT') {
                        const branchActive = isElementActive(rung.id, item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRungIdx(rIdx);
                              setSelectedItemId(item.id);
                            }}
                            className={`flex items-stretch border-2 rounded-xl p-2.5 transition-all shadow-md relative ${
                              selectedItemId === item.id
                                ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/40'
                                : branchActive
                                  ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                  : 'border-indigo-500/60 bg-indigo-950/30'
                            }`}
                          >
                            {/* Left Branch Rail (Vertical Tie) */}
                            <div className="flex flex-col items-center justify-between mr-2 py-1">
                              <span className="text-[10px] text-indigo-400 font-bold">┌</span>
                              <div className={`w-1 flex-1 rounded-full ${branchActive ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                              <span className="text-[10px] text-indigo-400 font-bold">└</span>
                            </div>

                            {/* Branch Levels */}
                            <div className="flex flex-col gap-2.5">
                              {item.branches.map((path, pathIdx) => (
                                <div
                                  key={pathIdx}
                                  className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60"
                                >
                                  <span className="text-[9px] font-mono font-bold text-indigo-300 px-1 py-0.5 rounded bg-indigo-950">
                                    PATH {String.fromCharCode(65 + pathIdx)}
                                  </span>

                                  {path.map(subItem => (
                                    <RungElementCard
                                      key={subItem.id}
                                      item={subItem}
                                      isSelected={selectedItemId === subItem.id}
                                      isActive={isElementActive(rung.id, subItem.id)}
                                      onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(subItem.id); }}
                                      onOpenPicker={() => setAddressPickerTarget({ rungIdx: rIdx, itemId: subItem.id })}
                                      onDelete={() => handleDeleteItem(rIdx, subItem.id)}
                                      onDropItem={(e) => handleDropOnElement(e, rIdx, subItem.id)}
                                    />
                                  ))}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddContactToBranchPath(rIdx, item.id, pathIdx);
                                    }}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono border border-slate-700 cursor-pointer transition active:scale-95"
                                  >
                                    + Contact
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Right Branch Rail (Vertical Tie) */}
                            <div className="flex flex-col items-center justify-between ml-2 py-1">
                              <span className="text-[10px] text-indigo-400 font-bold">┐</span>
                              <div className={`w-1 flex-1 rounded-full ${branchActive ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                              <span className="text-[10px] text-indigo-400 font-bold">┘</span>
                            </div>

                            {/* Branch Controls */}
                            <div className="flex flex-col justify-between ml-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(rIdx, item.id); }}
                                className="text-slate-500 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                                title="Delete Parallel Branch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddLevelToBranch(rIdx, item.id); }}
                                className="text-indigo-400 hover:text-indigo-200 text-[10px] font-mono p-0.5"
                                title="Add 3rd parallel path"
                              >
                                +Level
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={item.id} className="relative group">
                          <RungElementCard
                            item={item}
                            isSelected={selectedItemId === item.id}
                            isActive={isElementActive(rung.id, item.id)}
                            onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                            onOpenPicker={() => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id })}
                            onDelete={() => handleDeleteItem(rIdx, item.id)}
                            onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                            onBranchAround={() => handleBranchAroundItem(rIdx, item.id)}
                          />
                        </div>
                      );
                    })}

                    {/* Button / Drop Zone: Add Contact */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOverTarget(`zone_${rIdx}_in`); }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => handleDropOnRungZone(e, rIdx, 'input')}
                      onClick={() => handleAddInstructionToRung(rIdx, 'XIC')}
                      className={`px-3 py-2.5 rounded-xl border-2 border-dashed transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
                        dragOverTarget === `zone_${rIdx}_in`
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 ring-2 ring-cyan-400'
                          : 'border-slate-700 bg-slate-900/60 hover:border-cyan-400 text-slate-400 hover:text-cyan-300'
                      }`}
                      title="Click or drag instruction here to add contact"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Contact</span>
                    </div>

                    {/* Button / Drop Zone: Add Branch */}
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'instruction', type: 'BRANCH', isBranch: true }));
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      onClick={() => handleAddBranchToRung(rIdx)}
                      className="px-3 py-2.5 rounded-xl border border-indigo-700/80 bg-indigo-950/40 hover:border-indigo-400 text-indigo-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                      title="Click to add parallel branch (OR logic / motor seal-in)"
                    >
                      <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                      <span>+ Branch</span>
                    </div>
                  </div>

                  {/* Right Side: Outputs */}
                  <div className="flex items-center gap-3 relative z-10 ml-auto py-2">
                    {outputItems.map(item => {
                      if (item.type === 'TON') {
                        return (
                          <TimerInstructionBlock
                            key={item.id}
                            item={item}
                            isSelected={selectedItemId === item.id}
                            isActive={isElementActive(rung.id, item.id)}
                            plcData={plcData}
                            onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                            onOpenPicker={() => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id })}
                            onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                            onDelete={() => handleDeleteItem(rIdx, item.id)}
                            onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                          />
                        );
                      } else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(item.type)) {
                        return (
                          <MathInstructionBlock
                            key={item.id}
                            item={item}
                            isSelected={selectedItemId === item.id}
                            isActive={isElementActive(rung.id, item.id)}
                            plcData={plcData}
                            onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                            onOpenPicker={() => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id })}
                            onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                            onDelete={() => handleDeleteItem(rIdx, item.id)}
                            onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                          />
                        );
                      } else {
                        return (
                          <RungElementCard
                            key={item.id}
                            item={item}
                            isSelected={selectedItemId === item.id}
                            isActive={isElementActive(rung.id, item.id)}
                            onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                            onOpenPicker={() => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id })}
                            onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                            onDelete={() => handleDeleteItem(rIdx, item.id)}
                            onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                          />
                        );
                      }
                    })}

                    {/* Button / Drop Zone: Add Output */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOverTarget(`zone_${rIdx}_out`); }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => handleDropOnRungZone(e, rIdx, 'output')}
                      onClick={() => handleAddInstructionToRung(rIdx, 'OTE')}
                      className={`px-3 py-2.5 rounded-xl border-2 border-dashed transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
                        dragOverTarget === `zone_${rIdx}_out`
                          ? 'border-amber-400 bg-amber-950/60 text-amber-300 ring-2 ring-amber-400'
                          : 'border-slate-700 bg-slate-900/60 hover:border-amber-400 text-slate-400 hover:text-amber-300'
                      }`}
                      title="Click or drag output coil here"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Output</span>
                    </div>
                  </div>
                </div>

                {/* L2 Neutral Rail (Right) */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2.5 h-24 rounded-full bg-slate-600" />
                  <span className="text-[10px] font-mono font-bold text-slate-500 mt-1">L2</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Full-width Add Rung button at bottom */}
        <button
          onClick={handleAddRung}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-cyan-300 font-mono text-xs flex items-center justify-center gap-2 transition group cursor-pointer"
        >
          <Plus className="w-4 h-4 group-hover:scale-125 transition-transform text-cyan-400" />
          <span className="font-bold">+ Add New Ladder Rung</span>
        </button>
      </div>

      {/* 4. Quick Address Picker Modal / Popover */}
      {addressPickerTarget && (
        <div
          onClick={() => setAddressPickerTarget(null)}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border-2 border-cyan-500/80 rounded-2xl p-5 shadow-2xl max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Select I/O Address for Instruction</span>
              </h4>
              <button
                onClick={() => setAddressPickerTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {COMMON_ADDRESS_OPTIONS.map((grp) => (
                <div key={grp.group} className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {grp.group}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {grp.items.map((item) => (
                      <button
                        key={item.addr}
                        onClick={() => {
                          handleUpdateItem(addressPickerTarget.rungIdx, addressPickerTarget.itemId, { operand: item.addr });
                          setAddressPickerTarget(null);
                        }}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400 text-left cursor-pointer transition active:scale-95"
                      >
                        <div>
                          <span className="text-xs font-mono font-bold text-cyan-300 block">
                            {item.addr}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Instruction Card
function RungElementCard({
  item,
  isSelected,
  isActive,
  onSelect,
  onOpenPicker,
  onUpdate,
  onDelete,
  onDropItem,
  onBranchAround
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isOutput = ['OTE', 'OTL', 'OTU', 'TON', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(item.type);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDropItem(e); }}
      className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1.5 min-w-[125px] transition-all duration-150 shadow-md cursor-pointer relative ${
        isDragOver
          ? 'ring-4 ring-emerald-400 border-emerald-300 bg-emerald-950/80 scale-105'
          : isSelected
            ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            : isActive
              ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-[0_0_20px_#10b981]'
              : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-slate-500'
      }`}
    >
      {/* Top Header: Type & Action */}
      <div className="w-full flex items-center justify-between border-b border-black/10 pb-1">
        <span className={`text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded ${
          isActive && !isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-cyan-300'
        }`}>
          {item.type}
        </span>

        <div className="flex items-center gap-1">
          {onBranchAround && !isOutput && (
            <button
              onClick={(e) => { e.stopPropagation(); onBranchAround(); }}
              className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/80 hover:bg-indigo-700 text-indigo-200 border border-indigo-600/50 font-mono cursor-pointer transition"
              title="Branch parallel around this contact"
            >
              +Branch
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={`p-0.5 rounded hover:text-red-500 cursor-pointer ${isActive && !isSelected ? 'text-slate-900' : 'text-slate-500'}`}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Symbol */}
      <div className="font-mono text-base font-extrabold tracking-widest my-0.5">
        {item.type === 'XIC' && '-[ ]-'}
        {item.type === 'XIO' && '-[/]-'}
        {item.type === 'OTE' && '-( )-'}
        {item.type === 'OTL' && '-(L)-'}
        {item.type === 'OTU' && '-(U)-'}
        {item.type === 'TON' && '[TON]'}
        {item.type === 'RES' && '-(RES)-'}
        {item.type === 'MOV' && '[MOV]'}
        {item.type === 'EQU' && '[EQU]'}
        {item.type === 'ADD' && '[ADD]'}
        {item.type === 'SUB' && '[SUB]'}
        {item.type === 'MUL' && '[MUL]'}
        {item.type === 'DIV' && '[DIV]'}
      </div>

      {/* Target Address Card (Clickable to change address!) */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenPicker(); }}
        className={`w-full py-1 px-2 rounded-lg border text-center text-xs font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer hover:scale-102 ${
          isActive && !isSelected
            ? 'bg-slate-950 text-emerald-300 border-emerald-400'
            : 'bg-slate-950 text-cyan-300 border-slate-700 hover:border-cyan-400'
        }`}
        title="Click to change I/O address"
      >
        <span>{item.operand || 'Pick Address'}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* Timer Preset (if TON) */}
      {item.type === 'TON' && (
        <div className="w-full flex items-center justify-between text-[10px] mt-0.5 pt-1 border-t border-black/10">
          <span className="font-bold">Preset:</span>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={item.params?.pre || 2.0}
            onChange={(e) => onUpdate({ params: { ...item.params, pre: parseFloat(e.target.value) || 1 } })}
            onClick={(e) => e.stopPropagation()}
            className="w-12 text-center rounded px-1 font-bold bg-slate-800 text-amber-300 border border-slate-700"
          />
          <span>sec</span>
        </div>
      )}
    </div>
  );
}

// RSLogix 500 Timer On Delay (TON) Instruction Block
function TimerInstructionBlock({
  item,
  isSelected,
  isActive,
  plcData,
  onSelect,
  onOpenPicker,
  onUpdate,
  onDelete,
  onDropItem
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const operand = item.operand || 'T4:0';
  const tIdx = parseInt(String(operand).replace(/^T4:/, ''), 10) || 0;
  const timerData = plcData?.T4?.[tIdx] || { PRE: item.params?.pre || 100, ACC: 0, EN: false, TT: false, DN: false };

  const timeBase = item.params?.timeBase !== undefined ? item.params.timeBase : 1.0;
  const presetVal = item.params?.pre !== undefined ? item.params.pre : (timerData.PRE || 100);
  const accumVal = timerData ? (typeof timerData.ACC === 'number' ? Math.round(timerData.ACC) : 0) : 0;

  const isEnabled = !!timerData?.EN;
  const isDone = !!timerData?.DN;
  const isTiming = !!timerData?.TT;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDropItem(e); }}
      className="flex items-center relative select-none cursor-pointer py-1"
    >
      {/* Input Wire connection into left edge */}
      <div className={`w-3.5 h-1 ${isActive ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`} />

      {/* Main RSLogix 500 Timer Block Box */}
      <div
        className={`relative rounded border-2 px-3.5 pt-3 pb-2.5 min-w-[200px] font-mono shadow-xl transition-all duration-150 ${
          isDragOver
            ? 'ring-4 ring-emerald-400 border-emerald-300 bg-emerald-950/80 scale-102'
            : isSelected
              ? 'ring-2 ring-cyan-400 border-cyan-400 bg-slate-900 shadow-[0_0_18px_rgba(6,182,212,0.4)]'
              : isActive
                ? 'border-emerald-500 bg-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'border-blue-500 bg-slate-950 hover:border-blue-400'
        }`}
      >
        {/* Top Header Broken Line with 'TON' */}
        <div className="absolute -top-3 left-5 px-2 py-0.5 bg-slate-900 border border-blue-500/70 rounded text-blue-400 font-extrabold text-xs tracking-wider flex items-center gap-1 shadow-sm">
          <span>TON</span>
        </div>

        {/* Delete Button (top right) */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1.5 right-1.5 p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer"
          title="Delete Timer Block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Title matching screenshot: 'Timer On Delay' */}
        <div className="text-[12px] font-sans font-bold text-blue-400 mb-2">
          Timer On Delay
        </div>

        {/* Rows matching RSLogix 500 layout */}
        <div className="space-y-1.5 text-xs font-mono">
          {/* Row 1: Timer Address */}
          <div className="flex items-center justify-between">
            <span className="text-blue-300 font-medium">Timer</span>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenPicker(); }}
              className="font-bold text-white hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              title="Click to change timer address (T4:0, T4:1, etc.)"
            >
              <span>{operand}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* Row 2: Time Base */}
          <div className="flex items-center justify-between">
            <span className="text-blue-300 font-medium">Time Base</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextBase = timeBase === 1.0 ? 0.01 : 1.0;
                onUpdate({ params: { ...item.params, timeBase: nextBase } });
              }}
              className="font-bold text-white hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Click to toggle Time Base (1.0s / 0.01s)"
            >
              {timeBase.toFixed(timeBase < 1 ? 2 : 1)}
            </button>
          </div>

          {/* Row 3: Preset */}
          <div className="flex items-center justify-between">
            <span className="text-blue-300 font-medium">Preset</span>
            <div className="flex items-center">
              <input
                type="number"
                min="1"
                step="1"
                value={presetVal}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 1;
                  onUpdate({ params: { ...item.params, pre: val } });
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-16 text-right bg-slate-900 text-white font-mono font-bold rounded px-1.5 py-0.5 border border-slate-700/80 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-blue-400 font-bold ml-0.5">&lt;</span>
            </div>
          </div>

          {/* Row 4: Accumulator */}
          <div className="flex items-center justify-between">
            <span className="text-blue-300 font-medium">Accum</span>
            <div className="flex items-center">
              <span className={`w-16 text-right font-mono font-bold px-1.5 py-0.5 ${
                isTiming
                  ? 'text-amber-400 animate-pulse'
                  : isDone
                    ? 'text-emerald-400'
                    : 'text-white'
              }`}>
                {accumVal}
              </span>
              <span className="text-blue-400 font-bold ml-0.5">&lt;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Outputs: (EN) and (DN) Terminals */}
      <div className="flex flex-col justify-between h-[96px] py-1.5 ml-1 text-xs font-mono">
        {/* Enable (EN) Terminal */}
        <div className="flex items-center">
          <div className={`w-4 h-0.5 transition-all ${isEnabled ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-blue-500'}`} />
          <div
            className={`px-1.5 py-0.5 rounded border font-mono font-extrabold text-[11px] transition-all flex items-center justify-center ${
              isEnabled
                ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-[0_0_12px_#10b981]'
                : 'border-blue-500 text-blue-300 bg-slate-900'
            }`}
            title="Enable Bit (T4:0.EN) — High when timer receives power"
          >
            (EN)
          </div>
          <div className={`w-4 h-0.5 transition-all ${isEnabled ? 'bg-emerald-400' : 'bg-slate-700'}`} />
        </div>

        {/* Done (DN) Terminal */}
        <div className="flex items-center">
          <div className={`w-4 h-0.5 transition-all ${isDone ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-blue-500'}`} />
          <div
            className={`px-1.5 py-0.5 rounded border font-mono font-extrabold text-[11px] transition-all flex items-center justify-center ${
              isDone
                ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-[0_0_12px_#10b981]'
                : 'border-blue-500 text-blue-300 bg-slate-900'
            }`}
            title="Done Bit (T4:0.DN) — High when Accum >= Preset"
          >
            (DN)
          </div>
          <div className={`w-4 h-0.5 transition-all ${isDone ? 'bg-emerald-400' : 'bg-slate-700'}`} />
        </div>
      </div>
    </div>
  );
}

// RSLogix 500 Math Instruction Block (ADD, SUB, MUL, DIV)
function MathInstructionBlock({
  item,
  isSelected,
  isActive,
  plcData,
  onSelect,
  onOpenPicker,
  onUpdate,
  onDelete,
  onDropItem
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const type = item.type || 'ADD';
  const operand = item.operand || 'N7:0';
  const params = item.params || {};

  const sourceA = params.sourceA !== undefined ? params.sourceA : operand;
  const sourceB = params.sourceB !== undefined ? params.sourceB : '1';
  const dest = params.dest || operand || 'N7:1';

  // Helper to resolve live display value
  const getDisplayVal = (addrOrNum) => {
    if (addrOrNum === undefined || addrOrNum === null) return 0;
    const s = String(addrOrNum).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    if (s.startsWith('N7:')) {
      const idx = parseInt(s.replace('N7:', ''), 10);
      return plcData?.N7?.[idx] ?? 0;
    }
    if (s.startsWith('T4:')) {
      const match = s.match(/^T4:(\d+)\.([A-Z]+)$/);
      if (match) {
        const tIdx = parseInt(match[1], 10);
        const field = match[2];
        const timer = plcData?.T4?.[tIdx];
        if (timer && field === 'ACC') return Math.round(timer.ACC);
        if (timer && field === 'PRE') return timer.PRE;
      }
    }
    return plcData?.bits?.[s] ? 1 : 0;
  };

  const valA = getDisplayVal(sourceA);
  const valB = getDisplayVal(sourceB);
  const destVal = getDisplayVal(dest);

  const titles = {
    ADD: 'Add',
    SUB: 'Subtract',
    MUL: 'Multiply',
    DIV: 'Divide'
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDropItem(e); }}
      className="flex items-center relative select-none cursor-pointer py-1"
    >
      {/* Input Conductor Line */}
      <div className={`w-3.5 h-1 ${isActive ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`} />

      {/* Math Block Frame */}
      <div
        className={`relative rounded border-2 px-3.5 pt-3 pb-2.5 min-w-[210px] font-mono shadow-xl transition-all duration-150 ${
          isDragOver
            ? 'ring-4 ring-emerald-400 border-emerald-300 bg-emerald-950/80 scale-102'
            : isSelected
              ? 'ring-2 ring-cyan-400 border-cyan-400 bg-slate-900 shadow-[0_0_18px_rgba(6,182,212,0.4)]'
              : isActive
                ? 'border-emerald-500 bg-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'border-indigo-500 bg-slate-950 hover:border-indigo-400'
        }`}
      >
        {/* Top Header Broken Line with Type */}
        <div className="absolute -top-3 left-5 px-2 py-0.5 bg-slate-900 border border-indigo-500/70 rounded text-indigo-300 font-extrabold text-xs tracking-wider flex items-center gap-1 shadow-sm">
          <span>{type}</span>
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1.5 right-1.5 p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer"
          title={`Delete ${type} Block`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Title */}
        <div className="text-[12px] font-sans font-bold text-indigo-300 mb-2">
          {titles[type] || 'Compute'}
        </div>

        {/* Rows: Source A, Source B, Dest */}
        <div className="space-y-1.5 text-xs font-mono">
          {/* Source A */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 font-medium text-[11px]">Source A</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={sourceA}
                onChange={(e) => onUpdate({ params: { ...params, sourceA: e.target.value } })}
                onClick={(e) => e.stopPropagation()}
                className="w-16 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right font-bold text-white text-[11px]"
                title="Source A operand or constant"
              />
              <span className="text-[10px] text-cyan-400 font-bold px-1 rounded bg-slate-800">
                &lt; {valA} &gt;
              </span>
            </div>
          </div>

          {/* Source B */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 font-medium text-[11px]">Source B</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={sourceB}
                onChange={(e) => onUpdate({ params: { ...params, sourceB: e.target.value } })}
                onClick={(e) => e.stopPropagation()}
                className="w-16 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right font-bold text-white text-[11px]"
                title="Source B operand or constant"
              />
              <span className="text-[10px] text-cyan-400 font-bold px-1 rounded bg-slate-800">
                &lt; {valB} &gt;
              </span>
            </div>
          </div>

          {/* Dest */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <span className="text-indigo-400 font-bold text-[11px]">Dest</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={dest}
                onChange={(e) => onUpdate({ operand: e.target.value, params: { ...params, dest: e.target.value } })}
                onClick={(e) => e.stopPropagation()}
                className="w-16 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-right font-bold text-amber-300 text-[11px]"
                title="Destination Register (e.g. N7:0)"
              />
              <span className={`text-[10px] font-bold px-1.5 rounded ${
                isActive ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-400'
              }`}>
                &lt; {destVal} &gt;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Output Conductor Line to Right */}
      <div className={`w-3.5 h-1 ${isActive ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`} />
    </div>
  );
}

export default LadderEditor;
