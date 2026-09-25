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
  plcData,
  onUndo,
  onRedo,
  isRunning,
  logicIssues
}) {
  const [selectedRungIdx, setSelectedRungIdx] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [addressPickerTarget, setAddressPickerTarget] = useState(null); // { rungIdx, itemId }

  const [isBranchMode, setIsBranchMode] = useState(false);
  const [branchStartNode, setBranchStartNode] = useState(null);

  // Diagnostics validation passed from App via logicIssues
  const hasErrors = logicIssues?.some(i => i.severity === 'error');

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
    setIsBranchMode(false);
    setBranchStartNode(null);
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

  const handleNodeClick = (rungIdx, itemIdx) => {
    if (!isBranchMode) return;
    if (!branchStartNode) {
      setBranchStartNode({ rungIdx, itemIdx });
    } else {
      if (branchStartNode.rungIdx === rungIdx) {
        handleCreateBranchSpan(rungIdx, branchStartNode.itemIdx, itemIdx);
      }
      setBranchStartNode(null);
      setIsBranchMode(false);
    }
  };

  const handleCreateBranchSpan = (rungIdx, idxA, idxB) => {
    const startIdx = Math.min(idxA, idxB);
    const endIdx = Math.max(idxA, idxB);
    const rung = rungs[rungIdx];
    if (!rung || startIdx >= endIdx) return;
    
    const nextItems = [...rung.items];
    const inputs = nextItems.filter(it => !isOutputInstruction(it.type));
    const outputs = nextItems.filter(it => isOutputInstruction(it.type));
    
    const branchItems = inputs.slice(startIdx, endIdx);
    const newBranch = {
      id: `branch_${Date.now()}`,
      type: 'BRANCH',
      branches: [
        branchItems,
        [] // Empty bottom branch ready for elements
      ]
    };
    
    const newInputs = [
      ...inputs.slice(0, startIdx),
      newBranch,
      ...inputs.slice(endIdx)
    ];
    
    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: [...newInputs, ...outputs] };
    onChangeRungs(nextRungs);
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
          // ignore drop for branch
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
      // Ctrl + Z (Undo)
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl + Y or Ctrl + Shift + Z (Redo)
      if ((cmdOrCtrl && (e.key === 'y' || e.key === 'Y')) || (cmdOrCtrl && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        onRedo?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, selectedRungIdx, rungs, clipboard, onUndo, onRedo]);

  return (
    <div className="bg-[#1e1e1e] border border-[#2d2d2d] overflow-hidden shadow-xl flex flex-col flex-1 focus:outline-none h-full">
      {/* 1. Categorized Instruction & I/O Palette */}
      <div className="relative">
        <InstructionPalette
          onAddInstruction={(type) => handleAddInstructionToRung(selectedRungIdx, type)}
          isBranchMode={isBranchMode}
          onToggleBranchMode={() => {
            setIsBranchMode(!isBranchMode);
            setBranchStartNode(null);
          }}
          onSelectIoToken={handlePaletteSelectIo}
          hasSelection={!!selectedItemId}
        />
        {isRunning && <div className="absolute inset-0 bg-slate-900/40 z-50 cursor-not-allowed" title="Stop the program to edit logic" />}
      </div>

      {/* Branch Mode Instructional Banner */}
      {isBranchMode && (
        <div className="bg-blue-900/60 border-b border-blue-500/50 text-blue-200 px-4 py-1.5 text-xs font-mono flex items-center justify-center gap-2 shadow-inner shrink-0 z-10 relative">
          <GitFork className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="font-semibold tracking-wide">
            {branchStartNode 
              ? "Branch start selected. Now click a second dot to complete the parallel branch." 
              : "Branch Mode: Click any dot on the wires to set the start point of your parallel branch."}
          </span>
          <button 
            onClick={() => { setIsBranchMode(false); setBranchStartNode(null); }}
            className="ml-4 px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-700 hover:border-blue-400 hover:text-white text-blue-300 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

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

        {/* Utility Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = '.json';
              fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const loaded = JSON.parse(event.target.result);
                    if (Array.isArray(loaded)) onChangeRungs(loaded);
                  } catch (err) {
                    alert('Invalid JSON file.');
                  }
                };
                reader.readAsText(file);
              };
              fileInput.click();
            }}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${isRunning ? 'opacity-50 cursor-not-allowed border-slate-700 text-slate-500 bg-transparent' : 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'}`}
            title="Import logic from JSON"
          >
            Import
          </button>
          
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(rungs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'ladder_logic.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-bold transition cursor-pointer"
            title="Export logic to JSON"
          >
            Export
          </button>

          <div className="w-[1px] h-5 bg-slate-700 mx-1" />

          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all rungs? This cannot be undone.")) {
                onChangeRungs([{ id: `r_${Date.now()}`, comment: 'Rung 000: Control logic', items: [] }]);
              }
            }}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${isRunning ? 'opacity-50 cursor-not-allowed border-slate-700 text-slate-500 bg-transparent' : 'border-red-900/50 text-red-400 hover:bg-red-950 hover:text-red-300 cursor-pointer'}`}
            title="Clear all rungs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Rungs</span>
          </button>

          <button
            id="tour-add-rung"
            onClick={handleAddRung}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition ${isRunning ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-500' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95 cursor-pointer'}`}
            title="Add a new blank rung to the ladder program"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Rung</span>
          </button>
        </div>
      </div>

      {/* 3. Ladder Rungs Canvas Container */}
      <div id="tour-rungs" className={`flex-1 p-4 overflow-y-auto space-y-4 transition-all relative ${isRunning ? 'bg-slate-900/90 grayscale-[0.3]' : 'bg-slate-950/60'}`}>
        {isRunning && (
          <div className="sticky top-0 z-50 flex justify-center mb-4 pointer-events-none">
            <div className="bg-amber-500 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
              PROGRAM IS RUNNING - STOP TO MAKE EDITS
            </div>
          </div>
        )}
        
        {/* If running, block all clicks with an invisible overlay */}
        {isRunning && <div className="absolute inset-0 z-40" />}

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
                  <div className="flex items-center gap-1 relative z-10 flex-wrap py-2">
                    {inputItems.map((item, idx) => {
                      if (item.type === 'BRANCH' || item.type === 'SPLIT') {
                        const branchActive = isElementActive(rung.id, item.id);
                        return (
                          <React.Fragment key={item.id}>
                            <WireJunctionHandle 
  rungIdx={rIdx} 
  itemIdx={idx} 
  onDropJunction={handleCreateBranchSpan} 
  isBranchMode={isBranchMode}
  branchStartNode={branchStartNode}
  onNodeClick={handleNodeClick}
/>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRungIdx(rIdx);
                                setSelectedItemId(item.id);
                              }}
                              className={`flex items-stretch border-2 rounded-xl p-2.5 transition-all shadow-md relative mx-2 ${
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
                          </React.Fragment>
                        );
                      }

                      return (
                        <React.Fragment key={item.id}>
                          <WireJunctionHandle 
  rungIdx={rIdx} 
  itemIdx={idx} 
  onDropJunction={handleCreateBranchSpan} 
  isBranchMode={isBranchMode}
  branchStartNode={branchStartNode}
  onNodeClick={handleNodeClick}
/>
                          <div className="relative group mx-1">
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
                        </React.Fragment>
                      );
                    })}
                    <WireJunctionHandle 
  rungIdx={rIdx} 
  itemIdx={inputItems.length} 
  onDropJunction={handleCreateBranchSpan} 
  isBranchMode={isBranchMode}
  branchStartNode={branchStartNode}
  onNodeClick={handleNodeClick}
/>

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

// Minimalist ISA-101 Industrial Instruction Card
function RungElementCard({ item, isSelected, isActive, onSelect, onOpenPicker, onDelete }) {
  const isOutput = ['OTE', 'OTL', 'OTU', 'TON', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(item.type);
  const color = isActive ? 'text-emerald-400' : 'text-slate-300';
  
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className="flex flex-col items-center justify-center relative select-none group px-2 cursor-pointer"
    >
      {/* Label above - Explicit Dropdown Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onOpenPicker(); }}
        className={`flex items-center gap-0.5 text-[10px] font-mono mb-1 px-1.5 py-0.5 rounded border transition-colors ${
          isActive 
            ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-800/60' 
            : 'bg-[#2a2d34] border-slate-600/50 text-slate-300 hover:bg-[#343842] hover:border-cyan-500/50 hover:text-cyan-300'
        }`}
        title="Click to assign I/O address"
      >
        <span>{item.operand || 'Assign'}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {/* Symbol */}
      <div className={`text-base font-mono font-bold tracking-widest leading-none ${color} ${isSelected ? 'ring-1 ring-cyan-500 px-1 rounded bg-[#2a2a2a]' : ''}`}>
        {item.type === 'XIC' && '-[ ]-'}
        {item.type === 'XIO' && '-[/]-'}
        {item.type === 'OTE' && '-( )-'}
        {item.type === 'OTL' && '-(L)-'}
        {item.type === 'OTU' && '-(U)-'}
        {item.type === 'TON' && '[TON]'}
        {item.type === 'RES' && '-(RES)-'}
        {['MOV', 'EQU', 'ADD', 'SUB', 'MUL', 'DIV'].includes(item.type) && `[${item.type}]`}
      </div>

      {/* Controls Overlay */}
      {isSelected && (
        <div className="absolute -top-6 right-[-10px] flex items-center bg-[#2d2d2d] border border-[#404040] shadow-xl rounded z-50">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:text-red-400 text-slate-400" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Minimalist Timer Block
function TimerInstructionBlock({ item, isSelected, isActive, plcData, onSelect, onOpenPicker, onDelete }) {
  return <RungElementCard item={item} isSelected={isSelected} isActive={isActive} onSelect={onSelect} onOpenPicker={onOpenPicker} onDelete={onDelete} />;
}

// Minimalist Math Block
function MathInstructionBlock({ item, isSelected, isActive, plcData, onSelect, onOpenPicker, onDelete }) {
  return <RungElementCard item={item} isSelected={isSelected} isActive={isActive} onSelect={onSelect} onOpenPicker={onOpenPicker} onDelete={onDelete} />;
}

// Small gray square that appears on wires during branch mode
function BranchDotNode({ rungIdx, itemIdx, isBranchMode, branchStartNode, onNodeClick }) {
  if (!isBranchMode) return <div className="w-4 h-[1px] shrink-0 bg-transparent" />;
  
  const isStart = branchStartNode?.rungIdx === rungIdx && branchStartNode?.itemIdx === itemIdx;
  
  return (
    <div 
      className="flex items-center justify-center w-4 h-4 cursor-pointer relative z-20 group bg-slate-900 mx-1" 
      onClick={(e) => { e.stopPropagation(); onNodeClick(rungIdx, itemIdx); }}
    >
      <div className={`transition-all rounded-[1px] ${
        isStart 
          ? 'w-2.5 h-2.5 bg-emerald-500 ring-2 ring-emerald-300/40 rounded-full' 
          : 'w-2 h-2 bg-slate-500 group-hover:bg-cyan-400 group-hover:scale-125 group-hover:rounded-full'
      }`} />
    </div>
  );
}

function WireJunctionHandle({ rungIdx, itemIdx, onDropJunction, isBranchMode, branchStartNode, onNodeClick }) {
  return (
    <BranchDotNode 
      rungIdx={rungIdx} 
      itemIdx={itemIdx} 
      isBranchMode={isBranchMode} 
      branchStartNode={branchStartNode} 
      onNodeClick={onNodeClick} 
    />
  );
}

export default LadderEditor;
