import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, GitFork, X, Check, AlertTriangle, ChevronDown, Search, Edit2, Pencil, Sparkles, GripVertical, Tag, SlidersHorizontal, Lightbulb, Clock, Cpu, Hash, ArrowLeft } from 'lucide-react';
import { InstructionPalette } from './InstructionPalette';
import { validateLadderLogic } from '../engine/plcValidator';
import { parseProgramFile } from '../engine/programFile';

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
    { addr: 'T4:1.DN', label: 'T4:1 Done', desc: 'Timer 1 Done Bit' },
    { addr: 'T4:1.TT', label: 'T4:1 Timing', desc: 'Timer 1 Timing Bit' },
    { addr: 'T4:1.EN', label: 'T4:1 Enable', desc: 'Timer 1 Enable Bit' },
    { addr: 'N7:1', label: 'N7:1 Step', desc: 'Sequence Step Register' }
  ]}
];

const METAL_SHEAR_ADDRESS_OPTIONS = [
  { group: 'Inputs (Switches & Sensors)', items: [
    { addr: 'I:0/0', label: 'START_PB', desc: 'Start Pushbutton (N.O.)' },
    { addr: 'I:0/1', label: 'STOP_PB', desc: 'Stop Pushbutton (N.C.)' },
    { addr: 'I:0/2', label: 'PROX', desc: 'Proximity Sensor (Cut Point)' },
    { addr: 'I:0/3', label: 'DOWN_LS', desc: 'Shear Blade Down Limit' },
    { addr: 'I:0/4', label: 'UP_LS', desc: 'Shear Blade Up Limit' }
  ]},
  { group: 'Outputs (Motors & Cylinders)', items: [
    { addr: 'O:0/0', label: 'CONV1', desc: 'Conveyor 1 Motor' },
    { addr: 'O:0/1', label: 'CONV2', desc: 'Conveyor 2 Motor' },
    { addr: 'O:0/2', label: 'SHEAR', desc: 'Shear Blade Cylinder Down' },
    { addr: 'O:0/3', label: 'CONV3', desc: 'Conveyor 3 Motor' }
  ]},
  { group: 'Internal Relays (B3)', items: [
    { addr: 'B3:0/0', label: 'RUN_RELAY', desc: 'System Master Run Flag' },
    { addr: 'B3:0/1', label: 'Internal Bit 1', desc: 'Relay Flag 1' },
    { addr: 'B3:0/2', label: 'Internal Bit 2', desc: 'Relay Flag 2' }
  ]},
  { group: 'Timers & Registers', items: [
    { addr: 'T4:0', label: 'Timer T4:0', desc: 'Timer Block 0' },
    { addr: 'T4:1', label: 'Timer T4:1', desc: 'Timer Block 1' },
    { addr: 'T4:0.DN', label: 'T4:0 Done', desc: 'Timer 0 Done Bit' },
    { addr: 'T4:0.TT', label: 'T4:0 Timing', desc: 'Timer 0 Timing Bit' },
    { addr: 'T4:0.EN', label: 'T4:0 Enable', desc: 'Timer 0 Enable Bit' },
    { addr: 'N7:0', label: 'Integer N7:0', desc: 'Math Register 0' }
  ]}
];

export function LadderEditor({
  activeSandbox,
  rungs,
  onChangeRungs,
  scanResult,
  plcData,
  onUndo,
  onRedo,
  isRunning,
  onStop,
  logicIssues,
  symbols,
  onUpdateSymbol
}) {
  const [selectedRungIdx, setSelectedRungIdx] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [addressPickerTarget, setAddressPickerTarget] = useState(null); // { rungIdx, itemId }

  const [isBranchMode, setIsBranchMode] = useState(false);
  const [branchStartNode, setBranchStartNode] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Diagnostics validation passed from App via logicIssues
  const hasErrors = logicIssues?.length > 0;

  // Extract all existing timers in the current program (or default to T4:0)
  const existingTimers = useMemo(() => {
    const set = new Set();
    const traverse = (items) => {
      if (!items) return;
      for (const item of items) {
        if (['TON', 'TOF', 'RTO', 'RES'].includes(item.type)) {
          if (item.operand && /^T4:\d+$/i.test(item.operand)) {
            set.add(item.operand.toUpperCase());
          }
        }
        if (item.branches) {
          item.branches.forEach(b => traverse(b));
        }
      }
    };
    rungs.forEach(r => traverse(r.items));
    if (set.size === 0) set.add('T4:0');
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [rungs]);

  const [customTimers, setCustomTimers] = useState([]);

  const availableTimers = useMemo(() => {
    const set = new Set(existingTimers);
    customTimers.forEach(t => set.add(t));
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [existingTimers, customTimers]);

  const handleAddNewTimer = () => {
    const nums = availableTimers.map(t => parseInt(t.replace(/\D/g, ''), 10) || 0);
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 0;
    const newTimer = `T4:${nextNum}`;
    setCustomTimers(prev => [...prev, newTimer]);
    return newTimer;
  };

  // Prepend mapped timer options to Address Picker based on available timers
  const dynamicAddressOptions = useMemo(() => {
    const baseOptions = activeSandbox === 'MetalShear' ? METAL_SHEAR_ADDRESS_OPTIONS : COMMON_ADDRESS_OPTIONS;
    const timerItems = [];
    availableTimers.forEach(t => {
      timerItems.push(
        { addr: `${t}.DN`, label: `${t} Done`, desc: `${t} Done Bit (DN)` },
        { addr: `${t}.TT`, label: `${t} Timing`, desc: `${t} Timing Bit (TT)` },
        { addr: `${t}.EN`, label: `${t} Enable`, desc: `${t} Enable Bit (EN)` },
        { addr: t, label: `${t} Block`, desc: `Timer Register ${t}` }
      );
    });

    const timerGroup = {
      group: 'Mapped Timer Bits & Blocks',
      items: timerItems
    };

    const filteredBase = baseOptions.filter(grp => grp.group !== 'Timers & Registers');
    return [timerGroup, ...filteredBase];
  }, [activeSandbox, availableTimers]);

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

  const isOutputInstruction = (item) => {
    if (!item) return false;
    const type = typeof item === 'string' ? item : item.type;
    if (type === 'BRANCH') {
      return item.isOutputBranch === true;
    }
    return ['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(type);
  };

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
      } else if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM'].includes(type)) {
        operand = 'N7:0';
      } else if (['TON', 'TOF', 'RTO', 'RES'].includes(type)) {
        operand = 'T4:0';
      } else {
        operand = isOutput ? 'O:0/0' : 'I:0/0';
      }
    }

    let params = {};
    if (['TON', 'TOF', 'RTO'].includes(type)) params = { pre: 2.0, timeBase: 1.0 };
    else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(type)) {
      params = { sourceA: 'N7:0', sourceB: '1', dest: 'N7:1' };
    } else if (type === 'MOV') {
      params = { source: 'N7:0', dest: 'N7:1' };
    } else if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ'].includes(type)) {
      params = { sourceA: 'N7:0', sourceB: '1' };
    } else if (type === 'LIM') {
      params = { lowLim: '0', test: 'N7:0', highLim: '10' };
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
      const firstOutIdx = nextItems.findIndex(it => isOutputInstruction(it));
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

    const handleNodeClick = (rungIdx, itemIdx, isOutputZone = false) => {
    if (!isBranchMode) return;
    if (!branchStartNode) {
      setBranchStartNode({ rungIdx, itemIdx, isOutputZone });
    } else {
      if (branchStartNode.rungIdx === rungIdx && branchStartNode.isOutputZone === isOutputZone) {
        handleCreateBranchSpan(rungIdx, branchStartNode.itemIdx, itemIdx, isOutputZone);
      }
      setBranchStartNode(null);
      setIsBranchMode(false);
    }
  };

    const handleCreateBranchSpan = (rungIdx, idxA, idxB, isOutputZone = false) => {
    const startIdx = Math.min(idxA, idxB);
    const endIdx = Math.max(idxA, idxB);
    const rung = rungs[rungIdx];
    if (!rung || startIdx >= endIdx) return;
    
    const nextItems = [...rung.items];
    const inputs = nextItems.filter(it => !isOutputInstruction(it));
    const outputs = nextItems.filter(it => isOutputInstruction(it));
    
    const zoneItems = isOutputZone ? outputs : inputs;
    const branchItems = zoneItems.slice(startIdx, endIdx);
    
    const newBranch = {
      id: `branch_${Date.now()}`,
      type: 'BRANCH',
      isOutputBranch: isOutputZone,
      branches: [
        branchItems,
        [] // Empty bottom branch ready for elements
      ]
    };
    
    let finalItems;
    if (isOutputZone) {
      const newOutputs = [
        ...outputs.slice(0, startIdx),
        newBranch,
        ...outputs.slice(endIdx)
      ];
      finalItems = [...inputs, ...newOutputs];
    } else {
      const newInputs = [
        ...inputs.slice(0, startIdx),
        newBranch,
        ...inputs.slice(endIdx)
      ];
      finalItems = [...newInputs, ...outputs];
    }
    
    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: finalItems };
    onChangeRungs(nextRungs);
    setIsBranchMode(false);
    setBranchStartNode(null);
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
          const isOutput = isOutputInstruction(it);
          const newParallelContact = isOutput
            ? { id: `b_sub_${Date.now()}`, type: 'OTE', operand: 'O:0/0', desc: 'Output' }
            : { id: `b_sub_${Date.now()}`, type: 'XIC', operand: 'O:0/0', desc: 'Seal-In' };
          out.push({
            id: branchId,
            type: 'BRANCH',
            isOutputBranch: isOutput,
            branches: [
              [it],
              [newParallelContact]
            ]
          });
        } else {
          if (it.type === 'BRANCH' || it.type === 'SPLIT') {
            out.push({
              ...it,
              branches: it.branches.map(wrapList)
            });
          } else {
            out.push(it);
          }
        }
      }
      return out;
    };

    const nextRungs = [...rungs];
    nextRungs[rungIdx] = { ...rung, items: wrapList(rung.items) };
    onChangeRungs(nextRungs);
  };
    const handleAddInstructionToBranchPath = (rungIdx, branchId, pathIdx, type = 'OTE', extra = {}, defaultAddr = null) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const isOutput = isOutputInstruction(type);
    const newId = `bElem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newItem = {
      id: newId,
      type,
      operand: defaultAddr || (isOutput ? 'O:0/0' : 'I:0/0'),
      desc: isOutput ? (type === 'OTL' ? 'Latch Output' : type === 'OTU' ? 'Unlatch Output' : 'Output Coil') : 'Contact',
      ...extra
    };

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

  const handleAddContactToBranchPath = (rungIdx, branchId, pathIdx, isOutputZone = false) => {
    handleAddInstructionToBranchPath(rungIdx, branchId, pathIdx, isOutputZone ? 'OTE' : 'XIC');
  };

  const handleDropOnBranchPath = (e, rungIdx, branchId, pathIdx, isOutputZone) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.kind === 'instruction') {
        let extra = {};
        if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ'].includes(data.type)) {
          extra = { params: { sourceA: 'N7:0', sourceB: '1' } };
        } else if (data.type === 'LIM') {
          extra = { params: { lowLim: '0', test: 'N7:0', highLim: '10' } };
        } else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(data.type)) {
          extra = { params: { sourceA: 'N7:0', sourceB: '1', dest: 'N7:1' } };
        } else if (data.type === 'MOV') {
          extra = { params: { source: 'N7:0', dest: 'N7:1' } };
        } else if (['TON', 'TOF', 'RTO'].includes(data.type)) {
          extra = { params: { pre: 2.0, timeBase: 1.0 } };
        }
        handleAddInstructionToBranchPath(rungIdx, branchId, pathIdx, data.type, extra, data.operand || null);
      } else if (data.kind === 'io') {
        handleAddInstructionToBranchPath(rungIdx, branchId, pathIdx, isOutputZone ? 'OTE' : 'XIC', {}, data.addr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add an additional parallel path level to a branch
  const handleAddLevelToBranch = (rungIdx, branchId) => {
    const rung = rungs[rungIdx];
    if (!rung) return;

    const updateList = (list) => {
      return list.map(it => {
        if (it.id === branchId) {
          return { ...it, branches: [...it.branches, []] };
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
  const handleSwapItems = (rungIdx, id1, id2) => {
    if (id1 === id2) return;
    const rung = rungs[rungIdx];
    if (!rung) return;

    const nextRungs = JSON.parse(JSON.stringify(rungs));
    const targetRung = nextRungs[rungIdx];

    let ref1 = null, ref2 = null;
    let list1 = null, list2 = null, idx1 = -1, idx2 = -1;

    const traverse = (list) => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id1) { ref1 = list[i]; list1 = list; idx1 = i; }
        if (list[i].id === id2) { ref2 = list[i]; list2 = list; idx2 = i; }
        if (list[i].branches) {
          list[i].branches.forEach(b => traverse(b));
        }
      }
    };
    traverse(targetRung.items);

    if (ref1 && ref2) {
      // Swap them safely
      const temp1 = JSON.parse(JSON.stringify(ref1));
      const temp2 = JSON.parse(JSON.stringify(ref2));
      list1[idx1] = temp2;
      list2[idx2] = temp1;
      onChangeRungs(nextRungs);
    }
  };

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
      } else if (data.kind === 'existing-instruction') {
        handleSwapItems(rungIdx, data.itemId, targetItemId);
      } else if (data.kind === 'instruction') {
        if (data.isBranch || data.type === 'BRANCH' || data.type === 'SPLIT') {
          handleBranchAroundItem(rungIdx, targetItemId);
        } else {
          let extra = {};
          if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ'].includes(data.type)) {
            extra = { params: { sourceA: 'N7:0', sourceB: '1' } };
          } else if (data.type === 'LIM') {
            extra = { params: { lowLim: '0', test: 'N7:0', highLim: '10' } };
          }
          const updates = { type: data.type, ...extra };
          if (data.operand) updates.operand = data.operand;
          handleUpdateItem(rungIdx, targetItemId, updates);
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
          handleAddInstructionToRung(rungIdx, data.type, data.operand || null);
        }
      } else if (data.kind === 'existing-instruction') {
        const rung = rungs[rungIdx];
        if (!rung) return;

        const nextRungs = JSON.parse(JSON.stringify(rungs));
        const targetRung = nextRungs[rungIdx];

        let refItem = null;
        let oldList = null;
        let oldIdx = -1;

        const traverse = (list) => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === data.itemId) { refItem = list[i]; oldList = list; oldIdx = i; }
            if (list[i].branches) {
              list[i].branches.forEach(b => traverse(b));
            }
          }
        };
        traverse(targetRung.items);

        if (refItem && oldList) {
          const temp = JSON.parse(JSON.stringify(refItem));
          oldList.splice(oldIdx, 1);
                      if (zoneType === 'output') {
              if (temp.type === 'BRANCH') temp.isOutputBranch = true;
              targetRung.items.push(temp);
            } else {
            // Find insertion point right before outputs              const firstOutputIdx = targetRung.items.findIndex(it => isOutputInstruction(it));
            if (firstOutputIdx !== -1) {
              targetRung.items.splice(firstOutputIdx, 0, temp);
            } else {
              targetRung.items.push(temp);
            }
          }
          onChangeRungs(nextRungs);
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
      if (e.target.isContentEditable || e.target.closest('[role=dialog]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (isRunning) return;

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
          const isOut = isOutputInstruction(cloned);
          if (isOut) {
            nextItems.push(cloned);
          } else {
            const firstOut = nextItems.findIndex(it => isOutputInstruction(it));
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
  }, [selectedItemId, selectedRungIdx, rungs, clipboard, onUndo, onRedo, isRunning]);

  return (
    <div className="ladder-editor bg-[#1e1e1e] border border-[#2d2d2d] overflow-hidden shadow-xl flex flex-col flex-1 focus:outline-none h-full">
      
      {/* 1. Categorized Instruction & I/O Palette */}
      <div className="relative">
        <InstructionPalette
          disabled={isRunning}
          existingTimers={availableTimers}
          symbols={symbols}
          activeSandbox={activeSandbox}
          onAddInstruction={(type, defaultAddr) => {
            if (selectedItemId) {
              let extra = {};
              if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ'].includes(type)) {
                extra = { params: { sourceA: 'N7:0', sourceB: '1' } };
              } else if (type === 'LIM') {
                extra = { params: { lowLim: '0', test: 'N7:0', highLim: '10' } };
              } else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(type)) {
                extra = { params: { sourceA: 'N7:0', sourceB: '1', dest: 'N7:1' } };
              } else if (type === 'MOV') {
                extra = { params: { source: 'N7:0', dest: 'N7:1' } };
              } else if (['TON', 'TOF', 'RTO'].includes(type)) {
                extra = { params: { pre: 2.0, timeBase: 1.0 } };
              }
              const updates = { type, ...extra };
              if (defaultAddr) updates.operand = defaultAddr;
              handleUpdateItem(selectedRungIdx, selectedItemId, updates);
            } else {
              handleAddInstructionToRung(selectedRungIdx, type, defaultAddr);
            }
          }}
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
      <div className="editor-toolbar bg-slate-950/80 border-b border-slate-800 px-4 py-2.5 flex flex-wrap gap-3 items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
            Main routine
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
              <span>No issues found</span>
            </span>
          )}
        </div>

        {/* Utility Buttons */}
        <div className="flex flex-wrap items-center gap-2">
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
                    onChangeRungs(parseProgramFile(event.target.result));
                  } catch (err) {
                    alert(`Could not import program: ${err.message}`);
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
            onClick={() => setIsClearModalOpen(true)}
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
          <div className="running-notice sticky top-0 z-50 flex justify-center mb-4">
            <button 
              onClick={onStop}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
              Program is running · Click to stop
            </button>
          </div>
        )}
        
        {/* If running, block all clicks with an invisible overlay */}
        {isRunning && <div className="absolute inset-0 z-40" />}

        {rungs.map((rung, rIdx) => {
          const isRungSelected = selectedRungIdx === rIdx;
          const conducting = isRungActive(rung.id);
          const inputItems = rung.items.filter(it => !isOutputInstruction(it));
          const outputItems = rung.items.filter(it => isOutputInstruction(it));

          return (
            <div
              key={rung.id}
              onClick={() => { setSelectedRungIdx(rIdx); setSelectedItemId(null); }}
              data-selected={isRungSelected} data-conducting={conducting} className={`ladder-rung rounded-xl border p-3.5 transition-all cursor-pointer ${
                isRungSelected
                  ? 'border-cyan-500/80 bg-[#111214] shadow-[0_0_16px_rgba(6,182,212,0.15)]'
                  : conducting
                    ? 'border-emerald-500/60 bg-[#111214]'
                    : 'border-[#26282d] bg-[#111214] hover:border-[#3c4048]'
              }`}
            >
              {/* Rung Header */}
              <div className="rung-heading flex items-center justify-between text-xs pb-2 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`rung-index px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] ${
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
                    aria-label={`Rung ${rIdx} description`}
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
              <div className="flex items-center gap-3 relative py-1.5 min-h-[76px]">
                {/* L1 Power Rail (Left) */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`power-rail w-2 h-16 rounded-full transition-all duration-150 ${
                    conducting ? 'bg-emerald-400 shadow-[0_0_12px_#10b981]' : 'bg-blue-600'
                  }`} />
                  <span className="text-[10px] font-mono font-bold text-blue-400 mt-1">L1</span>
                </div>

                {/* Conductor & Instruction Wire Area */}
                <div className="flex-1 flex items-center justify-between px-2 relative min-h-[76px] overflow-x-auto">
                  {/* Background Conductor Wire */}
                  <div className={`rung-wire absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 transition-all duration-150 ${
                    conducting ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'
                  }`} />

                  {/* Left Side: Inputs & Parallel Branches */}
                  <div className="flex items-center gap-1 relative z-10 shrink-0 py-2">
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
                                    : 'border-slate-700/80 bg-slate-950/50'
                              }`}
                            >
                              {/* Left Branch Rail (Vertical Tie) */}
                              <div className="flex flex-col items-center justify-between mr-2 py-1">
                                <span className="text-[10px] text-indigo-400 font-bold">&bull;</span>
                                <div className={`w-1 flex-1 rounded-full ${branchActive ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                                <span className="text-[10px] text-indigo-400 font-bold">&bull;</span>
                              </div>

                              {/* Branch Levels */}
                              <div className="flex flex-col gap-2.5">
                                {item.branches.map((path, pathIdx) => (
                                  <div
                                    key={pathIdx}
                                    className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60"
                                  >
                                    <span className="text-[9px] font-mono font-bold text-slate-300 px-1 py-0.5 rounded bg-slate-800">
                                      PATH {String.fromCharCode(65 + pathIdx)}
                                    </span>

                                    {path.map(subItem => (
                                      <React.Fragment key={subItem.id}>
                                        {['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM'].includes(subItem.type) ? (
                                          <MathInstructionBlock
                                            item={subItem}
                                            isSelected={selectedItemId === subItem.id}
                                            isActive={isElementActive(rung.id, subItem.id)}
                                            plcData={plcData}
                                            symbols={symbols}
                                            onUpdateSymbol={onUpdateSymbol}
                                            onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(subItem.id); }}
                                            onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: subItem.id, rect })}
                                            onUpdate={(updates) => handleUpdateItem(rIdx, subItem.id, updates)}
                                            onDelete={() => handleDeleteItem(rIdx, subItem.id)}
                                            onDropItem={(e) => handleDropOnElement(e, rIdx, subItem.id)}
                                          />
                                        ) : (
                                          <RungElementCard
                                            symbols={symbols}
                                            onUpdateSymbol={onUpdateSymbol}
                                            item={subItem}
                                            isSelected={selectedItemId === subItem.id}
                                            isActive={isElementActive(rung.id, subItem.id)}
                                            onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(subItem.id); }}
                                            onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: subItem.id, rect })}
                                            onUpdate={(updates) => handleUpdateItem(rIdx, subItem.id, updates)}
                                            onDelete={() => handleDeleteItem(rIdx, subItem.id)}
                                            onDropItem={(e) => handleDropOnElement(e, rIdx, subItem.id)}
                                          />
                                        )}
                                      </React.Fragment>
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

                                {/* Add Path Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAddLevelToBranch(rIdx, item.id); }}
                                  className="mt-1.5 w-full py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/80 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Add OR Path
                                </button>
                              </div>

                              {/* Right Branch Rail (Vertical Tie) */}
                              <div className="flex flex-col items-center justify-between ml-2 py-1">
                                <span className="text-[10px] text-indigo-400 font-bold">&bull;</span>
                                <div className={`w-1 flex-1 rounded-full ${branchActive ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                                <span className="text-[10px] text-indigo-400 font-bold">&bull;</span>
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
                            {['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM'].includes(item.type) ? (
                              <MathInstructionBlock
                                item={item}
                                isSelected={selectedItemId === item.id}
                                isActive={isElementActive(rung.id, item.id)}
                                plcData={plcData}
                                symbols={symbols}
                                onUpdateSymbol={onUpdateSymbol}
                                onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                                onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id, rect })}
                                onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                                onDelete={() => handleDeleteItem(rIdx, item.id)}
                                onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                              />
                            ) : (
                              <RungElementCard
                                symbols={symbols}
                                onUpdateSymbol={onUpdateSymbol}
                                item={item}
                                isSelected={selectedItemId === item.id}
                                isActive={isElementActive(rung.id, item.id)}
                                onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                                onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id, rect })}
                                onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                                onDelete={() => handleDeleteItem(rIdx, item.id)}
                                onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                                onBranchAround={() => handleBranchAroundItem(rIdx, item.id)}
                              />
                            )}
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
                      className={`add-instruction px-3 py-2.5 rounded-xl border-2 border-dashed transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
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
                    <div className="flex items-center gap-1 relative z-10 ml-auto py-2">
                      {outputItems.map((item, idx) => {
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
                                isOutputZone={true}
                              />
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRungIdx(rIdx);
                                  setSelectedItemId(item.id);
                                }}
                                className={`flex items-stretch border-2 rounded-xl p-2.5 transition-all shadow-md relative mx-2 ${
                                  selectedItemId === item.id
                                    ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-950/40'
                                    : branchActive
                                      ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                      : 'border-amber-500/60 bg-amber-950/30'
                                }`}
                              >
                                {/* Left Branch Rail (Vertical Tie) */}
                                <div className="flex flex-col items-center justify-between mr-2 py-1">
                                  <span className="text-[10px] text-amber-400 font-bold">&bull;</span>
                                  <div className={`w-1 flex-1 rounded-full ${branchActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                  <span className="text-[10px] text-amber-400 font-bold">&bull;</span>
                                </div>
  
                                {/* Branch Levels */}
                                <div className="flex flex-col gap-2.5">
                                  {item.branches.map((path, pathIdx) => (
                                    <div
                                      key={pathIdx}
                                      className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60"
                                    >
                                      <span className="text-[9px] font-mono font-bold text-amber-300 px-1 py-0.5 rounded bg-amber-950">
                                        PATH {String.fromCharCode(65 + pathIdx)}
                                      </span>
  
                                      {path.map(subItem => (
                                        <React.Fragment key={subItem.id}>
                                          {['TON', 'TOF', 'RTO'].includes(subItem.type) ? (
                                            <TimerInstructionBlock
                                              item={subItem}
                                              isSelected={selectedItemId === subItem.id}
                                              isActive={isElementActive(rung.id, subItem.id)}
                                              plcData={plcData}
                                              symbols={symbols}
                                              onUpdateSymbol={onUpdateSymbol}
                                              onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(subItem.id); }}
                                              onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: subItem.id, rect })}
                                              onUpdate={(updates) => handleUpdateItem(rIdx, subItem.id, updates)}
                                              onDelete={() => handleDeleteItem(rIdx, subItem.id)}
                                              onDropItem={(e) => handleDropOnElement(e, rIdx, subItem.id)}
                                            />
                                          ) : ['ADD', 'SUB', 'MUL', 'DIV', 'MOV', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM'].includes(subItem.type) ? (
                                            <MathInstructionBlock
                                              item={subItem}
                                              isSelected={selectedItemId === subItem.id}
                                              isActive={isElementActive(rung.id, subItem.id)}
                                              plcData={plcData}
                                              symbols={symbols}
                                              onUpdateSymbol={onUpdateSymbol}
                                              onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(subItem.id); }}
                                              onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: subItem.id, rect })}
                                              onUpdate={(updates) => handleUpdateItem(rIdx, subItem.id, updates)}
                                              onDelete={() => handleDeleteItem(rIdx, subItem.id)}
                                              onDropItem={(e) => handleDropOnElement(e, rIdx, subItem.id)}
                                            />
                                          ) : (
                                            <RungElementCard
                                              symbols={symbols}
                                              onUpdateSymbol={onUpdateSymbol}
                                              item={subItem}
                                              isSelected={selectedItemId === subItem.id}
                                              isActive={isElementActive(rung.id, subItem.id)}
                                              onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(subItem.id); }}
                                              onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: subItem.id, rect })}
                                              onUpdate={(updates) => handleUpdateItem(rIdx, subItem.id, updates)}
                                              onDelete={() => handleDeleteItem(rIdx, subItem.id)}
                                              onDropItem={(e) => handleDropOnElement(e, rIdx, subItem.id)}
                                              onBranchAround={() => handleBranchAroundItem(rIdx, subItem.id)}
                                            />
                                          )}
                                        </React.Fragment>
                                      ))}
  
                                      {/* Add Instruction to Branch Path */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddContactToBranchPath(rIdx, item.id, pathIdx, true);
                                        }}
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-amber-400'); }}
                                        onDragLeave={(e) => e.currentTarget.classList.remove('ring-2', 'ring-amber-400')}
                                        onDrop={(e) => {
                                          e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
                                          handleDropOnBranchPath(e, rIdx, item.id, pathIdx, true);
                                        }}
                                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono border border-slate-700 cursor-pointer transition active:scale-95"
                                        title="Click or drop instruction (e.g. OTL, OTE, TON) here"
                                      >
                                        + Output
                                      </button>
                                    </div>
                                  ))}
  
                                  {/* Add Path Button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAddLevelToBranch(rIdx, item.id); }}
                                    className="mt-1.5 w-full py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/80 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add OR Path
                                  </button>
                                </div>
  
                                {/* Right Branch Rail (Vertical Tie) */}
                                <div className="flex flex-col items-center justify-between ml-2 py-1">
                                  <span className="text-[10px] text-amber-400 font-bold">&bull;</span>
                                  <div className={`w-1 flex-1 rounded-full ${branchActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                  <span className="text-[10px] text-amber-400 font-bold">&bull;</span>
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
                              isOutputZone={true}
                            />
                            <div className="relative group mx-1">
                              {['TON', 'TOF', 'RTO'].includes(item.type) ? (
                                <TimerInstructionBlock
                                  item={item}
                                  isSelected={selectedItemId === item.id}
                                  isActive={isElementActive(rung.id, item.id)}
                                  plcData={plcData}
                                  symbols={symbols}
                                  onUpdateSymbol={onUpdateSymbol}
                                  onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                                  onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id, rect })}
                                  onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                                  onDelete={() => handleDeleteItem(rIdx, item.id)}
                                  onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                                  onBranchAround={() => handleBranchAroundItem(rIdx, item.id)}
                                />
                              ) : ['ADD', 'SUB', 'MUL', 'DIV', 'MOV', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM'].includes(item.type) ? (
                                <MathInstructionBlock
                                  item={item}
                                  isSelected={selectedItemId === item.id}
                                  isActive={isElementActive(rung.id, item.id)}
                                  plcData={plcData}
                                  symbols={symbols}
                                  onUpdateSymbol={onUpdateSymbol}
                                  onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                                  onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id, rect })}
                                  onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                                  onDelete={() => handleDeleteItem(rIdx, item.id)}
                                  onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                                  onBranchAround={() => handleBranchAroundItem(rIdx, item.id)}
                                />
                              ) : (
                                <RungElementCard
                                  symbols={symbols}
                                  onUpdateSymbol={onUpdateSymbol}
                                  item={item}
                                  isSelected={selectedItemId === item.id}
                                  isActive={isElementActive(rung.id, item.id)}
                                  onSelect={() => { setSelectedRungIdx(rIdx); setSelectedItemId(item.id); }}
                                  onOpenPicker={(rect) => setAddressPickerTarget({ rungIdx: rIdx, itemId: item.id, rect })}
                                  onUpdate={(updates) => handleUpdateItem(rIdx, item.id, updates)}
                                  onDelete={() => handleDeleteItem(rIdx, item.id)}
                                  onDropItem={(e) => handleDropOnElement(e, rIdx, item.id)}
                                  onBranchAround={() => handleBranchAroundItem(rIdx, item.id)}
                                />
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                      <WireJunctionHandle 
                        rungIdx={rIdx} 
                        itemIdx={outputItems.length} 
                        onDropJunction={handleCreateBranchSpan} 
                        isBranchMode={isBranchMode}
                        branchStartNode={branchStartNode}
                        onNodeClick={handleNodeClick}
                        isOutputZone={true}
                      />

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
                  <div className="power-rail power-rail-right w-2 h-16 rounded-full bg-slate-500" />
                  <span className="text-[10px] font-mono font-bold text-slate-500 mt-1">L2</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Full-width Add Rung button at bottom */}
        <button
          onClick={handleAddRung}
          className="add-rung-placeholder w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-cyan-300 font-mono text-xs flex items-center justify-center gap-2 transition group cursor-pointer"
        >
          <Plus className="w-4 h-4 group-hover:scale-125 transition-transform text-cyan-400" />
          <span className="font-bold">+ Add New Ladder Rung</span>
        </button>
      </div>


      {/* Clear Rungs Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-900/50 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Clear Logic Memory?
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to delete all rungs? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onChangeRungs([{ id: `r_${Date.now()}`, comment: 'Rung 000: Control logic', items: [] }]);
                  setIsClearModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-red-900/50 text-red-400 border border-red-900/50 hover:bg-red-900 hover:text-red-200 transition"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Tapback Reaction Style Address Picker */}
      {addressPickerTarget && (
        <IOSReactionAddressPicker
          target={addressPickerTarget}
          targetItem={
            rungs[addressPickerTarget.rungIdx]
              ? findItemRecursive(rungs[addressPickerTarget.rungIdx].items, addressPickerTarget.itemId)
              : null
          }
          dynamicAddressOptions={dynamicAddressOptions}
          symbols={symbols}
          onUpdateSymbol={onUpdateSymbol}
          onSelectAddress={(chosenAddr) => {
            handleUpdateItem(addressPickerTarget.rungIdx, addressPickerTarget.itemId, { operand: chosenAddr });
            setAddressPickerTarget(null);
          }}
          onClose={() => setAddressPickerTarget(null)}
          onAddNewTimer={handleAddNewTimer}
        />
      )}
    </div>
  );
}

// Hook that reveals the trash button ~0.5 seconds after hovering over a rung element
function useHoverTrash() {
  const [hoverTrash, setHoverTrash] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setHoverTrash(true);
    }, 500); // 500ms delay (0.5s) for responsive hover delete select
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHoverTrash(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { hoverTrash, handleMouseEnter, handleMouseLeave };
}

function ItemDeleteButton({ isVisible, onDelete, title = "Delete instruction" }) {
  if (!isVisible) return null;
  return (
    <div className="absolute -top-5 right-[-8px] flex items-center bg-[#1e222b] border border-slate-700 hover:border-red-500/80 shadow-xl rounded z-50 animate-in fade-in zoom-in-95 duration-150">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 hover:text-red-400 text-slate-400 hover:bg-red-950/40 rounded transition cursor-pointer flex items-center justify-center"
        title={title}
        aria-label={title}
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
}

function ItemRenameButton({ isVisible, onRename, title = "Edit tag / symbol name" }) {
  if (!isVisible) return null;
  return (
    <div className="absolute -top-5 left-[-8px] flex items-center bg-[#1e222b] border border-slate-700 hover:border-cyan-400/80 shadow-xl rounded z-50 animate-in fade-in zoom-in-95 duration-150">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        className="p-1 hover:text-cyan-300 text-slate-400 hover:bg-cyan-950/40 rounded transition cursor-pointer flex items-center justify-center"
        title={title}
        aria-label={title}
      >
        <Pencil className="w-3.5 h-3.5 text-cyan-400" />
      </button>
    </div>
  );
}

// Minimalist ISA-101 Industrial Instruction Card
function RungElementCard({ item, isSelected, isActive, onSelect, onOpenPicker, onUpdate, onDelete, symbols, onUpdateSymbol, onDropItem, isOutputZone = false }) {
  const { hoverTrash, handleMouseEnter, handleMouseLeave } = useHoverTrash();
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [editingTagValue, setEditingTagValue] = useState('');
  const isOutput = ['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(item.type);
  const color = isActive 
    ? 'text-emerald-400 font-black drop-shadow-[0_0_8px_#10b981]' 
    : isOutput 
      ? 'text-amber-300 font-bold' 
      : 'text-cyan-300 font-bold';

  const enclosureClass = isActive
    ? 'border-emerald-500/60 bg-emerald-950/40 shadow-[0_0_12px_rgba(16,185,129,0.22)]'
    : isSelected
      ? isOutput
        ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50'
        : 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/50'
      : isOutput
        ? 'border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-400/60 hover:bg-amber-500/[0.08]'
        : 'border-cyan-500/30 bg-cyan-500/[0.04] hover:border-cyan-400/60 hover:bg-cyan-500/[0.08]';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'existing-instruction', itemId: item.id }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-cyan-400'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('ring-2', 'ring-cyan-400')}
      onDrop={(e) => { 
        e.currentTarget.classList.remove('ring-2', 'ring-cyan-400');
        if (onDropItem) onDropItem(e); 
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`instruction-card border rounded-lg flex flex-col items-center justify-center relative select-none group px-2 py-1 cursor-pointer transition-all ${enclosureClass}`}
    >
      {/* Label above - Explicit Dropdown Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          onOpenPicker?.({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom });
        }}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-mono mb-1 px-1.5 py-0.5 rounded border transition-colors ${
          isActive 
            ? 'bg-emerald-900/60 border-emerald-400/70 text-emerald-200' 
            : isOutput
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-900/70'
              : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/70'
        }`}
        title="Click to assign I/O address"
      >
        <div className="flex items-center gap-0.5">
          <span>{item.operand || 'Assign'}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </div>
        {symbols?.[item.operand] && (
          <span className="text-[10px] text-slate-300 font-bold px-1 whitespace-nowrap overflow-hidden max-w-[80px] text-ellipsis leading-tight">
            {symbols[item.operand]}
          </span>
        )}
      </button>

      {/* Symbol with double-click-to-cycle (prevents accidental toggling on single-click/drag) */}
      <div 
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (onUpdate) {
            if (item.type === 'OTE') onUpdate({ type: 'OTL', desc: 'Latch Output' });
            else if (item.type === 'OTL') onUpdate({ type: 'OTU', desc: 'Unlatch Output' });
            else if (item.type === 'OTU') onUpdate({ type: 'OTE', desc: 'Output Lamp / Coil' });
            else if (item.type === 'XIC') onUpdate({ type: 'XIO', desc: 'Normally Closed' });
            else if (item.type === 'XIO') onUpdate({ type: 'XIC', desc: 'Normally Open Switch' });
          }
        }}
        className={`text-base font-mono tracking-widest leading-none ${color} ${isSelected ? 'px-1 rounded bg-black/40' : ''} hover:scale-105 transition-transform`}
        title={['OTE','OTL','OTU'].includes(item.type) ? "Double-click to cycle OTE -> OTL -> OTU" : ['XIC','XIO'].includes(item.type) ? "Double-click to toggle XIC <-> XIO" : ""}
      >
        {item.type === 'XIC' && '-] [-'}
        {item.type === 'XIO' && '-[/]-'}
        {item.type === 'OTE' && '-( )-'}
        {item.type === 'OTL' && '-(L)-'}
        {item.type === 'OTU' && '-(U)-'}
        {['TON', 'TOF', 'RTO'].includes(item.type) && `[${item.type}]`}
        {item.type === 'RES' && '-(RES)-'}
        {['ONS', 'OSR', 'OSF', 'MOV', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'ADD', 'SUB', 'MUL', 'DIV'].includes(item.type) && `[${item.type}]`}
      </div>

      {/* Deliberate Type Selector for Contacts (shown when selected) */}
      {['XIC', 'XIO'].includes(item.type) && !isOutputZone && isSelected && (
        <div className="flex items-center bg-black/60 rounded border border-cyan-500/40 overflow-hidden text-[9px] font-mono mt-1 shadow-sm animate-in fade-in zoom-in-95 duration-100">
          {[
            { t: 'XIC', label: '-] [-', title: 'Normally Open (XIC)' },
            { t: 'XIO', label: '-[/]-', title: 'Normally Closed (XIO)' }
          ].map(({ t, label, title }) => (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onUpdate && item.type !== t) {
                  onUpdate({ type: t, desc: t === 'XIO' ? 'Normally Closed' : 'Normally Open Switch' });
                }
              }}
              className={`px-1.5 py-0.5 transition cursor-pointer ${
                item.type === t
                  ? 'bg-cyan-500/40 text-cyan-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={title}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Quick Type Selector for Output Coils */}
      {['OTE', 'OTL', 'OTU'].includes(item.type) && (
        <div className="flex items-center bg-black/50 rounded border border-amber-500/30 overflow-hidden text-[9px] font-mono mt-1 shadow-sm">
          {[
            { t: 'OTE', label: '( )' },
            { t: 'OTL', label: '(L)' },
            { t: 'OTU', label: '(U)' }
          ].map(({ t, label }) => (
            <button
              key={t}
              onClick={(e) => {
                e.stopPropagation();
                if (onUpdate) onUpdate({ type: t, desc: t === 'OTL' ? 'Latch Output' : t === 'OTU' ? 'Unlatch Output' : 'Output Lamp / Coil' });
              }}
              className={`px-1.5 py-0.5 transition cursor-pointer ${
                item.type === t
                  ? 'bg-amber-500/40 text-amber-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={`Switch to ${t}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Quick Type Selector if contact is in an output branch */}
      {isOutputZone && ['XIC', 'XIO'].includes(item.type) && (
        <div className="flex items-center bg-black/50 rounded border border-amber-500/40 overflow-hidden text-[9px] font-mono mt-1 shadow-sm">
          {[
            { t: 'OTE', label: '( )' },
            { t: 'OTL', label: '(L)' },
            { t: 'OTU', label: '(U)' }
          ].map(({ t, label }) => (
            <button
              key={t}
              onClick={(e) => {
                e.stopPropagation();
                if (onUpdate) onUpdate({ type: t, desc: t === 'OTL' ? 'Latch Output' : t === 'OTU' ? 'Unlatch Output' : 'Output Lamp / Coil' });
              }}
              className="px-1.5 py-0.5 transition cursor-pointer text-amber-300 hover:text-white hover:bg-amber-900/60"
              title={`Convert contact to ${t} output`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Quick Bit Selector for Timer Status Contacts (DN, TT, EN) */}
      {['XIC', 'XIO'].includes(item.type) && item.operand && /^T4:\d+[./](DN|EN|TT)$/i.test(item.operand) && (() => {
        const match = item.operand.match(/^(T4:\d+)[./]([A-Z]+)$/i);
        const prefix = match[1].toUpperCase();
        const curBit = match[2].toUpperCase();
        return (
          <div className="flex items-center bg-black/50 rounded border border-purple-500/40 overflow-hidden text-[9px] font-mono mt-1 shadow-sm">
            {['DN', 'TT', 'EN'].map((bit) => (
              <button
                key={bit}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUpdate) onUpdate({ operand: `${prefix}.${bit}` });
                }}
                className={`px-1.5 py-0.5 transition cursor-pointer ${
                  curBit === bit
                    ? 'bg-purple-500/50 text-purple-200 font-bold'
                    : 'text-slate-400 hover:text-purple-200 hover:bg-slate-800'
                }`}
                title={`Map contact to ${prefix}.${bit}`}
              >
                {bit}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Controls Overlay with hover & select support */}
      <ItemDeleteButton isVisible={isSelected || hoverTrash} onDelete={onDelete} />
      <ItemRenameButton
        isVisible={isSelected || hoverTrash}
        onRename={() => {
          setIsEditingTag(true);
          setEditingTagValue(symbols?.[item.operand] || '');
        }}
      />

      {/* Inline Tag & Variable Name Rename Popover */}
      {isEditingTag && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border-2 border-cyan-500 rounded-lg p-1.5 shadow-2xl flex items-center gap-1.5 min-w-[210px] animate-in fade-in duration-100 text-slate-100"
        >
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between text-[9px] text-cyan-300 font-mono font-bold mb-0.5">
              <span>TAG FOR {item.operand || 'ITEM'}</span>
              <button
                type="button"
                onClick={(e) => {
                  setIsEditingTag(false);
                  const r = e.currentTarget.getBoundingClientRect();
                  onOpenPicker?.({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom });
                }}
                className="text-slate-400 hover:text-cyan-200 underline text-[8px] cursor-pointer"
              >
                Change Addr
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={editingTagValue}
              onChange={(e) => setEditingTagValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (item.operand && onUpdateSymbol) {
                    onUpdateSymbol(item.operand, editingTagValue.trim());
                  }
                  setIsEditingTag(false);
                } else if (e.key === 'Escape') {
                  setIsEditingTag(false);
                }
              }}
              placeholder="e.g. Arm Switch"
              className="bg-slate-950 border border-slate-700 text-white text-xs px-1.5 py-0.5 rounded outline-none focus:border-cyan-400 font-sans"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (item.operand && onUpdateSymbol) {
                onUpdateSymbol(item.operand, editingTagValue.trim());
              }
              setIsEditingTag(false);
            }}
            className="self-end px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer transition"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditingTag(false)}
            className="self-end px-1 py-1 rounded text-slate-400 hover:text-white text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function TimerInstructionBlock({ item, isSelected, isActive, plcData, onSelect, onOpenPicker, onUpdate, onDelete, symbols, onUpdateSymbol, onDropItem }) {
  const { hoverTrash, handleMouseEnter, handleMouseLeave } = useHoverTrash();
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [editingTagValue, setEditingTagValue] = useState('');
  const color = isActive ? 'text-emerald-400' : 'text-slate-300';
  const borderColor = isActive ? 'border-emerald-500/60' : 'border-[#3c414a]';
  const bgHeader = isActive ? 'bg-emerald-950/30' : 'bg-[#1a1c20]';
  const bgBody = 'bg-[#22252a]';
  
  const timerMatch = item.operand ? item.operand.match(/^T4:(\d+)$/) : null;
  const tId = timerMatch ? timerMatch[1] : null;
  const liveTimer = (plcData && tId !== null && plcData.T4) ? plcData.T4[Number(tId)] : null;
  
  const acc = liveTimer ? liveTimer.ACC.toFixed(0) : '0';
  const enActive = liveTimer ? liveTimer.EN : false;
  const ttActive = liveTimer ? liveTimer.TT : false;
  const dnActive = liveTimer ? liveTimer.DN : false;
  
  const getTimerDesc = (t) => {
    if (t === 'TOF') return 'Timer Off Delay';
    if (t === 'RTO') return 'Retentive Timer On';
    return 'Timer On Delay';
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'existing-instruction', itemId: item.id }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-cyan-400'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('ring-2', 'ring-cyan-400')}
      onDrop={(e) => { 
        e.currentTarget.classList.remove('ring-2', 'ring-cyan-400');
        if (onDropItem) onDropItem(e); 
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex flex-col border-2 ${isActive ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'border-purple-500/40 bg-purple-950/20 shadow-md'} rounded overflow-hidden select-none relative cursor-pointer min-w-[140px] mx-2 ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
    >
      <div className={`${bgHeader} px-2 py-1 border-b ${borderColor} flex justify-between items-center`}>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold ${color}`}>{item.type || 'TON'}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const next = item.type === 'TON' ? 'RTO' : item.type === 'RTO' ? 'TOF' : 'TON';
              onUpdate({ type: next });
            }}
            className="text-[8px] font-mono px-1 py-0.2 rounded bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 border border-purple-500/30 cursor-pointer"
            title="Click to cycle timer type (TON -> RTO -> TOF)"
          >
            switch
          </button>
        </div>
        <span className="text-[9px] text-slate-400 font-mono ml-2">{getTimerDesc(item.type)}</span>
      </div>
      
      <div className="flex">
        {/* Left Side: Parameters */}
        <div className={`${bgBody} p-2 flex flex-col gap-1.5 flex-1 border-r border-[#3c414a]`}>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 mr-2">Timer</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                onOpenPicker?.({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom });
              }}
              className={`font-mono font-bold px-1 rounded ${item.operand ? 'text-cyan-300 hover:bg-slate-700' : 'text-slate-500 bg-slate-800'}`}
              title="Click to assign Timer address"
            >
              {item.operand || 'Assign'}
            </button>
          </div>
          
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 mr-2">Time Base</span>
            <select 
              value={item.params?.timeBase !== undefined ? item.params.timeBase : 1.0}
              onChange={(e) => {
                const tb = Number(e.target.value);
                onUpdate({ params: { ...(item.params || {}), timeBase: tb } });
              }}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-cyan-300 bg-slate-900 border border-slate-700 hover:border-slate-500 focus:outline-none w-[50px] text-right rounded px-1 py-0.5 cursor-pointer"
            >
              <option value={1.0}>1.0</option>
              <option value={0.1}>0.1</option>
              <option value={0.01}>0.01</option>
            </select>
          </div>
          
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 mr-2">Preset</span>
            <input 
              type="number"
              min="0"
              value={item.params?.pre !== undefined ? item.params.pre : 50}
              onChange={(e) => onUpdate({ params: { ...(item.params || {}), pre: Number(e.target.value) } })}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-cyan-300 bg-slate-900 border border-slate-700 hover:border-slate-500 focus:outline-none w-[50px] text-right rounded px-1 py-0.5"
            />
          </div>
          
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 mr-2">Accum</span>
            <span className={`font-mono font-bold bg-slate-900 border border-transparent px-1 py-0.5 rounded w-[50px] text-right ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>{acc}</span>
          </div>
        </div>
        
        {/* Right Side: Output Coils (EN, TT, DN) - draggable onto rungs as contacts */}
        <div className={`${bgBody} flex flex-col items-center justify-between py-1 px-1 w-11 shrink-0 bg-[#1e2025]`}>
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('application/json', JSON.stringify({
                kind: 'instruction',
                type: 'XIC',
                operand: `${item.operand || 'T4:0'}.EN`,
                timerBit: 'EN',
                name: 'Timer Enable (EN)'
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="flex flex-col items-center cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-purple-950/40 transition group"
            title={`Drag to place ${item.operand || 'T4:0'}.EN contact on a rung`}
          >
            <span className={`text-[8px] font-mono font-bold mb-0.5 group-hover:text-purple-300 ${enActive ? 'text-emerald-400' : 'text-slate-500'}`}>(EN)</span>
            <div className={`w-2 h-2 rounded-full ${enActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`} />
          </div>
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('application/json', JSON.stringify({
                kind: 'instruction',
                type: 'XIC',
                operand: `${item.operand || 'T4:0'}.TT`,
                timerBit: 'TT',
                name: 'Timer Timing (TT)'
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="flex flex-col items-center cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-purple-950/40 transition group"
            title={`Drag to place ${item.operand || 'T4:0'}.TT contact on a rung`}
          >
            <span className={`text-[8px] font-mono font-bold mb-0.5 group-hover:text-purple-300 ${ttActive ? 'text-emerald-400' : 'text-slate-500'}`}>(TT)</span>
            <div className={`w-2 h-2 rounded-full ${ttActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`} />
          </div>
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('application/json', JSON.stringify({
                kind: 'instruction',
                type: 'XIC',
                operand: `${item.operand || 'T4:0'}.DN`,
                timerBit: 'DN',
                name: 'Timer Done (DN)'
              }));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="flex flex-col items-center cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-purple-950/40 transition group"
            title={`Drag to place ${item.operand || 'T4:0'}.DN contact on a rung`}
          >
            <span className={`text-[8px] font-mono font-bold mb-0.5 group-hover:text-purple-300 ${dnActive ? 'text-emerald-400' : 'text-slate-500'}`}>(DN)</span>
            <div className={`w-2 h-2 rounded-full ${dnActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`} />
          </div>
        </div>
      </div>
      <ItemDeleteButton isVisible={isSelected || hoverTrash} onDelete={onDelete} />
      <ItemRenameButton
        isVisible={isSelected || hoverTrash}
        onRename={() => {
          setIsEditingTag(true);
          const tAddr = item.operand || 'T4:0';
          setEditingTagValue(symbols?.[tAddr] || '');
        }}
      />

      {isEditingTag && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border-2 border-purple-500 rounded-lg p-1.5 shadow-2xl flex items-center gap-1.5 min-w-[210px] animate-in fade-in duration-100 text-slate-100"
        >
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between text-[9px] text-purple-300 font-mono font-bold mb-0.5">
              <span>TAG FOR {item.operand || 'T4:0'}</span>
              <button
                type="button"
                onClick={(e) => {
                  setIsEditingTag(false);
                  const r = e.currentTarget.getBoundingClientRect();
                  onOpenPicker?.({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom });
                }}
                className="text-slate-400 hover:text-purple-200 underline text-[8px] cursor-pointer"
              >
                Change Addr
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={editingTagValue}
              onChange={(e) => setEditingTagValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const tAddr = item.operand || 'T4:0';
                  if (onUpdateSymbol) {
                    onUpdateSymbol(tAddr, editingTagValue.trim());
                  }
                  setIsEditingTag(false);
                } else if (e.key === 'Escape') {
                  setIsEditingTag(false);
                }
              }}
              placeholder="e.g. Shear Delay Timer"
              className="bg-slate-950 border border-slate-700 text-white text-xs px-1.5 py-0.5 rounded outline-none focus:border-purple-400 font-sans"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const tAddr = item.operand || 'T4:0';
              if (onUpdateSymbol) {
                onUpdateSymbol(tAddr, editingTagValue.trim());
              }
              setIsEditingTag(false);
            }}
            className="self-end px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold cursor-pointer transition"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditingTag(false)}
            className="self-end px-1 py-1 rounded text-slate-400 hover:text-white text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function MathInstructionBlock({ item, isSelected, isActive, plcData, onSelect, onOpenPicker, onUpdate, onDelete, symbols, onUpdateSymbol, onDropItem }) {
  const { hoverTrash, handleMouseEnter, handleMouseLeave } = useHoverTrash();
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [editingTagValue, setEditingTagValue] = useState('');
  const isCompare = ['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM'].includes(item.type);
  const color = isActive ? 'text-emerald-400' : (isCompare ? 'text-orange-300' : 'text-slate-300');
  const borderColor = isActive ? 'border-emerald-500/60' : (isCompare ? 'border-orange-500/40' : 'border-[#3c414a]');
  const bgHeader = isActive ? 'bg-emerald-950/30' : (isCompare ? 'bg-orange-950/40' : 'bg-[#1a1c20]');
  const bgBody = 'bg-[#22252a]';
  
  const getTitle = () => {
    switch (item.type) {
      case 'ADD': return 'Add';
      case 'SUB': return 'Subtract';
      case 'MUL': return 'Multiply';
      case 'DIV': return 'Divide';
      case 'MOV': return 'Move';
      case 'EQU': return 'Equal';
      case 'NEQ': return 'Not Equal';
      case 'LES': return 'Less Than';
      case 'LEQ': return 'Less Equal';
      case 'GRT': return 'Greater Than';
      case 'GEQ': return 'Greater Equal';
      case 'LIM': return 'Limit Test';
      default: return item.type;
    }
  };

  const isLim = item.type === 'LIM';
  const hasSourceA = ['ADD', 'SUB', 'MUL', 'DIV', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ'].includes(item.type);
  const hasSourceB = ['ADD', 'SUB', 'MUL', 'DIV', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ'].includes(item.type);
  const hasDest = ['ADD', 'SUB', 'MUL', 'DIV', 'MOV'].includes(item.type);
  const hasSource = item.type === 'MOV';

  const resolveLiveVal = (addr) => {
    if (!plcData || addr === undefined || addr === null) return null;
    const str = String(addr).trim();
    if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);
    if (str.startsWith('N7:')) {
      const idx = parseInt(str.replace('N7:', ''), 10);
      return plcData.N7?.[idx] !== undefined ? plcData.N7[idx] : 0;
    }
    if (str.startsWith('T4:')) {
      const match = str.match(/^T4:(\d+)\.([A-Z]+)$/i);
      if (match) {
        const t = plcData.T4?.[parseInt(match[1], 10)];
        const field = match[2].toUpperCase();
        if (t && (field === 'ACC' || field === 'PRE')) return t[field];
      }
    }
    if (str.startsWith('C5:')) {
      const match = str.match(/^C5:(\d+)\.([A-Z]+)$/i);
      if (match) {
        const c = plcData.C5?.[parseInt(match[1], 10)];
        const field = match[2].toUpperCase();
        if (c && (field === 'ACC' || field === 'PRE')) return c[field];
      }
    }
    if (plcData.bits && Object.hasOwn(plcData.bits, str)) {
      return plcData.bits[str] ? 1 : 0;
    }
    return null;
  };

  const renderField = (label, paramKey, defaultVal) => {
    const rawVal = item.params?.[paramKey] !== undefined ? item.params[paramKey] : defaultVal;
    const liveVal = resolveLiveVal(rawVal);
    const hasLive = liveVal !== null && plcData;

    return (
      <div className="flex items-center justify-between gap-1.5 text-[10px]">
        <span className="text-slate-400 shrink-0 font-medium">{label}</span>
        <div className="flex items-center gap-1">
          <input 
            type="text"
            value={rawVal}
            onChange={(e) => {
              const newVal = e.target.value;
              const updates = { params: { ...(item.params || {}), [paramKey]: newVal } };
              if (paramKey === 'sourceA' || paramKey === 'test' || paramKey === 'source') {
                updates.operand = newVal;
              }
              onUpdate(updates);
            }}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-cyan-300 bg-slate-900 border border-slate-700 hover:border-slate-500 focus:outline-none w-[64px] text-right rounded px-1 py-0.5"
          />
          {hasLive && (
            <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-800 text-amber-300 shrink-0 border border-slate-700/60" title={`Current evaluated value: ${liveVal}`}>
              [{liveVal}]
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'existing-instruction', itemId: item.id }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', isCompare ? 'ring-orange-400' : 'ring-teal-400'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('ring-2', 'ring-orange-400', 'ring-teal-400')}
      onDrop={(e) => { 
        e.currentTarget.classList.remove('ring-2', 'ring-orange-400', 'ring-teal-400');
        if (onDropItem) onDropItem(e); 
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex flex-col border-2 ${
        isActive 
          ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
          : isCompare 
            ? 'border-orange-500/40 bg-orange-950/20 shadow-md' 
            : 'border-teal-500/40 bg-teal-950/20 shadow-md'
      } rounded overflow-hidden select-none relative cursor-pointer min-w-[130px] mx-2 ${
        isSelected ? (isCompare ? 'ring-2 ring-orange-400' : 'ring-2 ring-teal-400') : ''
      }`}
    >
      <div className={`${bgHeader} px-2 py-1 border-b ${borderColor} flex justify-between items-center`}>
        <span className={`text-[10px] font-bold ${color}`}>{item.type}</span>
        <span className="text-[9px] text-slate-400 font-mono ml-2">{getTitle()}</span>
      </div>
      
      <div className={`${bgBody} p-2 flex flex-col gap-1.5`}>
        {hasSource && renderField('Source', 'source', '0')}
        {isLim && renderField('Low Lim', 'lowLim', '0')}
        {isLim && renderField('Test', 'test', item.operand || 'N7:0')}
        {isLim && renderField('High Lim', 'highLim', '10')}
        {hasSourceA && renderField('Source A', 'sourceA', item.operand || 'N7:0')}
        {hasSourceB && renderField('Source B', 'sourceB', '1')}
        {hasDest && renderField('Dest', 'dest', 'N7:0')}
      </div>
      
      <ItemDeleteButton isVisible={isSelected || hoverTrash} onDelete={onDelete} />
      <ItemRenameButton
        isVisible={isSelected || hoverTrash}
        onRename={() => {
          setIsEditingTag(true);
          const mAddr = item.operand || item.params?.sourceA || item.params?.test || item.params?.dest || 'N7:0';
          setEditingTagValue(symbols?.[mAddr] || '');
        }}
      />

      {isEditingTag && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border-2 border-teal-500 rounded-lg p-1.5 shadow-2xl flex items-center gap-1.5 min-w-[210px] animate-in fade-in duration-100 text-slate-100"
        >
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between text-[9px] text-teal-300 font-mono font-bold mb-0.5">
              <span>TAG FOR {item.operand || item.params?.sourceA || item.params?.test || 'N7:0'}</span>
              <button
                type="button"
                onClick={(e) => {
                  setIsEditingTag(false);
                  const r = e.currentTarget.getBoundingClientRect();
                  onOpenPicker?.({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom });
                }}
                className="text-slate-400 hover:text-teal-200 underline text-[8px] cursor-pointer"
              >
                Change Addr
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={editingTagValue}
              onChange={(e) => setEditingTagValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const mAddr = item.operand || item.params?.sourceA || item.params?.test || item.params?.dest || 'N7:0';
                  if (onUpdateSymbol) {
                    onUpdateSymbol(mAddr, editingTagValue.trim());
                  }
                  setIsEditingTag(false);
                } else if (e.key === 'Escape') {
                  setIsEditingTag(false);
                }
              }}
              placeholder="e.g. Batch Counter"
              className="bg-slate-950 border border-slate-700 text-white text-xs px-1.5 py-0.5 rounded outline-none focus:border-teal-400 font-sans"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const mAddr = item.operand || item.params?.sourceA || item.params?.test || item.params?.dest || 'N7:0';
              if (onUpdateSymbol) {
                onUpdateSymbol(mAddr, editingTagValue.trim());
              }
              setIsEditingTag(false);
            }}
            className="self-end px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold cursor-pointer transition"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditingTag(false)}
            className="self-end px-1 py-1 rounded text-slate-400 hover:text-white text-[10px] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// Small gray square that appears on wires during branch mode
function BranchDotNode({ rungIdx, itemIdx, isBranchMode, branchStartNode, onNodeClick, isOutputZone = false }) {
  if (!isBranchMode) return <div className="w-4 h-[1px] shrink-0 bg-transparent" />;
  
  const isStart = branchStartNode?.rungIdx === rungIdx && branchStartNode?.itemIdx === itemIdx && branchStartNode?.isOutputZone === isOutputZone;
  
  return (
    <div 
      className="branch-dot-container flex items-center justify-center w-4 h-4 cursor-pointer relative z-20 group bg-slate-900 mx-1" 
      onClick={(e) => { e.stopPropagation(); onNodeClick(rungIdx, itemIdx, isOutputZone); }}
    >
      <div className={`transition-all rounded-[1px] ${
        isStart 
          ? 'w-2.5 h-2.5 bg-emerald-500 ring-2 ring-emerald-300/40 rounded-full' 
          : 'w-2 h-2 bg-slate-500 group-hover:bg-cyan-400 group-hover:scale-125 group-hover:rounded-full'
      }`} />
    </div>
  );
}

function WireJunctionHandle({ rungIdx, itemIdx, isBranchMode, branchStartNode, onNodeClick, isOutputZone = false }) {
  return (
    <BranchDotNode 
      rungIdx={rungIdx} 
      itemIdx={itemIdx} 
      isBranchMode={isBranchMode} 
      branchStartNode={branchStartNode} 
      onNodeClick={onNodeClick}
      isOutputZone={isOutputZone}
    />
  );
}

// iOS Tapback Reaction Style Address & I/O Picker
// Stage 1: Compact horizontal pill with 5 iOS bounce reaction icon categories (Inputs, Outputs, Timers, Relays, Registers) + Close
// Stage 2: In-place smooth morphing into category selection list with back button, custom address entry, live tag rename, and timer add
function IOSReactionAddressPicker({
  target,
  targetItem,
  dynamicAddressOptions,
  symbols,
  onUpdateSymbol,
  onSelectAddress,
  onClose,
  onAddNewTimer
}) {
  const [selectedCategory, setSelectedCategory] = useState(null); // null (Stage 1) or 'INPUTS' | 'OUTPUTS' | 'TIMERS' | 'RELAYS' | 'DATA'
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAddr, setEditingAddr] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Flatten all items with group tags
  const allItems = useMemo(() => {
    const list = [];
    (dynamicAddressOptions || []).forEach(grp => {
      const gName = (grp.group || '').toUpperCase();
      let tabCategory = 'OTHER';
      if (gName.includes('INPUT')) tabCategory = 'INPUTS';
      else if (gName.includes('OUTPUT')) tabCategory = 'OUTPUTS';
      else if (gName.includes('INTERNAL') || gName.includes('B3') || gName.includes('RELAY')) tabCategory = 'RELAYS';
      else if (gName.includes('TIMER') || gName.includes('T4')) tabCategory = 'TIMERS';
      else if (gName.includes('REGISTER') || gName.includes('INTEGER') || gName.includes('N7') || gName.includes('DATA')) tabCategory = 'DATA';

      (grp.items || []).forEach(item => {
        const symbolLabel = symbols?.[item.addr] || item.label || '';
        list.push({
          ...item,
          groupName: grp.group,
          tabCategory,
          displayLabel: symbolLabel
        });
      });
    });
    return list;
  }, [dynamicAddressOptions, symbols]);

  // Filter items when a category is selected
  const filteredItems = useMemo(() => {
    if (!selectedCategory) return [];
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter(item => {
      if (item.tabCategory !== selectedCategory) return false;
      if (!q) return true;
      const matchAddr = item.addr.toLowerCase().includes(q);
      const matchLabel = item.displayLabel.toLowerCase().includes(q);
      const matchDesc = (item.desc || '').toLowerCase().includes(q);
      return matchAddr || matchLabel || matchDesc;
    });
  }, [allItems, selectedCategory, searchQuery]);

  const normalizedQuery = searchQuery.trim().toUpperCase();
  const hasExactMatch = allItems.some(i => i.addr.toUpperCase() === normalizedQuery);
  const isValidAddressFormat = /^[IOTEB3T4N7S2]:\d+(\/\d+|\.\w+)?$/i.test(normalizedQuery) || /^[A-Z0-9_]{2,16}$/i.test(normalizedQuery);

  const handleStartEdit = (addr, currentLabel, e) => {
    e.stopPropagation();
    setEditingAddr(addr);
    setEditingLabel(currentLabel || '');
  };

  const handleSaveEdit = (addr, e) => {
    e.stopPropagation();
    if (onUpdateSymbol && editingLabel.trim()) {
      onUpdateSymbol(addr, editingLabel.trim());
    }
    setEditingAddr(null);
  };

  // Categories configuration for Stage 1 iOS Reaction Bubbles
  const categories = [
    {
      id: 'INPUTS',
      label: 'Inputs',
      badge: 'I',
      desc: 'Inputs (I:0/x)',
      icon: SlidersHorizontal,
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40 hover:bg-cyan-900/80 hover:border-cyan-400'
    },
    {
      id: 'OUTPUTS',
      label: 'Outputs',
      badge: 'O',
      desc: 'Outputs (O:0/x)',
      icon: Lightbulb,
      color: 'text-amber-300 bg-amber-950/60 border-amber-500/40 hover:bg-amber-900/80 hover:border-amber-400'
    },
    {
      id: 'TIMERS',
      label: 'Timers',
      badge: 'T4',
      desc: 'Timers & Bits (T4:x)',
      icon: Clock,
      color: 'text-purple-300 bg-purple-950/60 border-purple-500/40 hover:bg-purple-900/80 hover:border-purple-400'
    },
    {
      id: 'RELAYS',
      label: 'Relays',
      badge: 'B3',
      desc: 'Internal Relays (B3:0/x)',
      icon: Cpu,
      color: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40 hover:bg-emerald-900/80 hover:border-emerald-400'
    },
    {
      id: 'DATA',
      label: 'Data',
      badge: 'N7',
      desc: 'Registers (N7:x)',
      icon: Hash,
      color: 'text-blue-300 bg-blue-950/60 border-blue-500/40 hover:bg-blue-900/80 hover:border-blue-400'
    },
  ];

  const currentCatObj = categories.find(c => c.id === selectedCategory);

  // Position calculation anchored to instruction card
  const rect = target?.rect;
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const pickerWidth = selectedCategory ? 340 : 270;
  let left = winW / 2;
  let top = 120;
  let placeBelow = false;

  if (rect) {
    const centerX = rect.left + rect.width / 2;
    left = Math.max(pickerWidth / 2 + 12, Math.min(winW - pickerWidth / 2 - 12, centerX));
    if (rect.top < 230) {
      placeBelow = true;
      top = rect.bottom + 12;
    } else {
      placeBelow = false;
      top = rect.top - 12;
    }
  }

  return (
    <>
      {/* Transparent Click-Outside Overlay (NO dark blur over rungs) */}
      <div 
        className="fixed inset-0 z-[9990] bg-transparent cursor-default" 
        onClick={onClose} 
      />

      {/* Floating iOS Tapback Reaction Bubble Pop-Up */}
      <div
        style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          transform: placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          zIndex: 9995
        }}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto"
      >
        {/* Downward / Upward Pointer Tail */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 pointer-events-none transition-all ${
            placeBelow
              ? '-top-1.5 border-t border-l border-white/20 bg-[#17191f]'
              : '-bottom-1.5 border-b border-r border-white/20 bg-[#17191f]'
          } tail-triangle`}
        />

        {!selectedCategory ? (
          /* STAGE 1: iOS Tapback Category Reactions Pill */
          <div className="ios-reaction-picker flex items-center gap-1.5 p-1.5 bg-[#17191f]/95 backdrop-blur-2xl border border-white/20 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.6)] animate-in zoom-in-90 fade-in duration-150 select-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`group relative flex flex-col items-center justify-center w-11 h-11 rounded-full border transition-all duration-200 hover:scale-125 hover:-translate-y-1.5 active:scale-95 cursor-pointer shadow-md ${cat.color}`}
                title={cat.desc}
              >
                <cat.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="text-[9px] font-mono font-bold leading-none mt-0.5">{cat.badge}</span>

                {/* Floating tooltip */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900/95 border border-slate-700 text-white text-[10px] font-sans font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                  {cat.label}
                </div>
              </button>
            ))}

            <div className="w-[1px] h-6 bg-white/20 mx-0.5" />

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* STAGE 2: Morphed Category Selector */
          <div className="ios-reaction-picker flex flex-col w-[340px] max-w-[92vw] p-3 bg-[#17191f]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] text-slate-100 animate-in zoom-in-95 fade-in duration-150">
            {/* Header with Back button, Category name, and Close */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold transition cursor-pointer active:scale-95"
                title="Back to reaction icons"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Categories</span>
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                {currentCatObj && <currentCatObj.icon className="w-3.5 h-3.5 opacity-90" />}
                <span className="text-xs font-bold font-mono text-cyan-300">{currentCatObj?.label || 'Select'}</span>
              </div>

              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentCatObj?.label.toLowerCase()} or enter address...`}
                className="w-full bg-black/40 border border-white/15 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (normalizedQuery) {
                      onSelectAddress(normalizedQuery);
                    } else if (filteredItems.length > 0) {
                      onSelectAddress(filteredItems[0].addr);
                    }
                  }
                }}
              />
            </div>

            {/* Add New Timer Button (when in TIMERS category) */}
            {selectedCategory === 'TIMERS' && (
              <button
                type="button"
                onClick={() => {
                  if (onAddNewTimer) {
                    const newT = onAddNewTimer();
                    if (newT) onSelectAddress(newT);
                  }
                }}
                className="mb-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-500/50 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-xs font-mono font-bold cursor-pointer transition active:scale-95"
                title="Create a new timer register"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add New Timer</span>
              </button>
            )}

            {/* Custom Address Selection Chip */}
            {searchQuery.trim() && !hasExactMatch && isValidAddressFormat && (
              <button
                type="button"
                onClick={() => onSelectAddress(normalizedQuery)}
                className="mb-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-400 bg-cyan-600/30 text-cyan-200 text-xs font-mono font-bold cursor-pointer hover:bg-cyan-600/50 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Use Custom: {normalizedQuery}</span>
              </button>
            )}

            {/* Scrollable list of items in selected category */}
            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  No matching items found
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isCurrent = targetItem?.operand === item.addr;
                  const isEditing = editingAddr === item.addr;

                  return (
                    <div
                      key={item.addr}
                      onClick={() => onSelectAddress(item.addr)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border transition cursor-pointer group ${
                        isCurrent
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-400'
                          : 'border-white/5 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-black/40 shrink-0 text-cyan-300">
                          {item.addr}
                        </span>
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.addr, e);
                                if (e.key === 'Escape') setEditingAddr(null);
                              }}
                              className="text-[10px] bg-slate-900 border border-cyan-400 text-white px-1.5 py-0.5 rounded font-mono w-28 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={(e) => handleSaveEdit(item.addr, e)}
                              className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white"
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 truncate max-w-[170px]" title={item.displayLabel}>
                            {item.displayLabel || <span className="italic text-slate-500">No tag</span>}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(item.addr, item.displayLabel, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-cyan-300 text-slate-400 rounded transition"
                          title="Rename symbol name"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default LadderEditor;











