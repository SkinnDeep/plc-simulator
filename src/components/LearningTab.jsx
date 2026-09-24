import React, { useState } from 'react';
import {
  BookOpen,
  Play,
  RotateCcw,
  Zap,
  Cpu,
  Clock,
  Award,
  Layers,
  GitFork
} from 'lucide-react';

export function LearningTab({ onLoadProgram, onApplyChallengeSolution }) {
  const [activeModule, setActiveModule] = useState('lessons'); // 'lessons' | 'challenges'
  const [selectedLessonId, setSelectedLessonId] = useState('contacts-coils');
  const [selectedChallengeIdx, setSelectedChallengeIdx] = useState(0);

  // Sequencer step state for Lesson 5
  const [seqStep, setSeqStep] = useState(1);

  const LESSONS = [
    {
      id: 'contacts-coils',
      title: '1. Contacts & Coils (XIC, XIO, OTE)',
      subtitle: 'Slides 25-27: Fundamentals of Ladder Logic Rungs',
      icon: Cpu,
      content: (
        <div className="space-y-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-cyan-400 text-base mb-2">Ladder Logic Structure</h4>
            <p className="text-slate-300 leading-relaxed">
              In industrial PLCs, ladder diagrams represent control circuits between power rails (<strong>L1</strong> hot line on left, <strong>L2</strong> neutral on right).
              Current flows from left to right through input condition contacts to energize output coils.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="p-3 bg-slate-900 rounded border border-slate-800">
                <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">XIC - Examine If Closed</span>
                <span className="font-mono text-base font-bold text-white block mb-1">-[ ]-</span>
                <p className="text-[11px] text-slate-400">Normally open contact. Passes power when the address bit is 1 (closed).</p>
              </div>
              <div className="p-3 bg-slate-900 rounded border border-slate-800">
                <span className="text-xs font-mono font-bold text-cyan-400 block mb-1">XIO - Examine If Open</span>
                <span className="font-mono text-base font-bold text-white block mb-1">-[/]-</span>
                <p className="text-[11px] text-slate-400">Normally closed contact. Passes power when the address bit is 0 (open).</p>
              </div>
              <div className="p-3 bg-slate-900 rounded border border-slate-800">
                <span className="text-xs font-mono font-bold text-amber-400 block mb-1">OTE - Output Energize</span>
                <span className="font-mono text-base font-bold text-white block mb-1">-( )-</span>
                <p className="text-[11px] text-slate-400">Standard coil. Energizes output when rung continuity is complete.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => onLoadProgram('basic-direct')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load Direct 1:1 Ladder Logic
            </button>
            <button
              onClick={() => onLoadProgram('logic-gates-demo')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load Series AND Ladder Logic
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'parallel-branching',
      title: '2. Parallel Branching & Motor Seal-In',
      subtitle: 'Slides 31-33: 3-Wire Motor Control (Example 9.4)',
      icon: GitFork,
      content: (
        <div className="space-y-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-cyan-400 text-base mb-2">Motor Start / Stop Seal-In Circuit</h4>
            <p className="text-slate-300 leading-relaxed mb-3">
              Spring-loaded pushbuttons only make contact momentarily while held down.
              To maintain power after the operator releases the START button, we wire a <strong>Parallel Split Branch</strong>:
              an auxiliary normally open contact from the motor coil <code className="text-cyan-400 font-mono">-[ O:0/0 ]-</code> in parallel with the START pushbutton!
            </p>
            <div className="p-3 bg-slate-900 rounded font-mono text-xs text-slate-300 leading-relaxed border border-slate-800">
              <div className="text-cyan-400 font-bold mb-1">Rung Architecture:</div>
              <div>+--[ START PB (I:0/2) ]--+--[/ STOP PB (I:0/3) ]--( MOTOR O:0/0 )--+</div>
              <div>|                         |</div>
              <div>+--[ MOTOR AUX (O:0/0) ]--+</div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              When START is pressed, MOTOR turns ON and closes the auxiliary contact. Releasing START keeps current flowing through the parallel contact until STOP is pressed!
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => onLoadProgram('or-gate')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load Simple Parallel Branch
            </button>
            <button
              onClick={() => onLoadProgram('motor-start-stop')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load Motor Seal-In Circuit
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'latch-unlatch',
      title: '3. Latch (OTL) vs Unlatch (OTU)',
      subtitle: 'Slides 32-33: Retentive Memory Coils',
      icon: Layers,
      content: (
        <div className="space-y-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-cyan-400 text-base mb-2">Retentive Latching Instructions</h4>
            <p className="text-slate-300 leading-relaxed mb-3">
              Standard output coils <code className="text-amber-400">-( )-</code> turn off immediately when their rung becomes false.
              In contrast, <strong>Output Latch -(L)-</strong> turns a bit ON and keeps it ON even after the rung goes false!
              To turn the bit off, you must execute an <strong>Output Unlatch -(U)-</strong> on the same address.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900 rounded border border-amber-500/30">
                <span className="font-mono font-bold text-amber-400 block text-xs">-(L)- Output Latch (OTL)</span>
                <p className="text-xs text-slate-300 mt-1">Sets bit to 1. Bit remains 1 even if rung goes false.</p>
              </div>
              <div className="p-3 bg-slate-900 rounded border border-amber-500/30">
                <span className="font-mono font-bold text-amber-400 block text-xs">-(U)- Output Unlatch (OTU)</span>
                <p className="text-xs text-slate-300 mt-1">Sets bit to 0. Unlatch is used in pairs with OTL using the same address.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'timers',
      title: '4. Timers in RSLogix 500 (TON)',
      subtitle: 'Slides 15-26: Timer On Delay and Status Bits',
      icon: Clock,
      content: (
        <div className="space-y-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-cyan-400 text-base mb-2">Timer On Delay (TON)</h4>
            <p className="text-slate-300 leading-relaxed mb-3">
              A <strong>TON Timer</strong> begins incrementing its accumulator (ACC) when the rung condition is true.
              If the rung goes false before setpoint, ACC resets to 0.
            </p>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold block">.EN (Enable)</span>
                <span className="text-slate-400">1 when rung is true</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-amber-400 font-bold block">.TT (Timing)</span>
                <span className="text-slate-400">1 while counting (ACC &lt; PRE)</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold block">.DN (Done)</span>
                <span className="text-slate-400">1 when ACC reaches PRE</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onLoadProgram('timer-ton')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load Timer TON Demo
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'sequential-logic',
      title: '5. Sequential Step Control (Slides 34-47)',
      subtitle: 'Slides 34-47: Complete 11-step MicroLogix Sequencer Project',
      icon: Award,
      content: (
        <div className="space-y-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-cyan-400 text-base mb-2">Sequential Programming with EQU & MOV</h4>
            <p className="text-slate-300 leading-relaxed mb-3">
              Sequential control ensures operations occur in a strict, predictable order without conflicting logic.
              Integer register <code className="text-cyan-400 font-mono">N7:1</code> stores the current step number (1 to 10).
              Each rung checks <code className="text-teal-400 font-mono">[EQU N7:1 Step]</code> and uses <code className="text-amber-400 font-mono">[MOV Next N7:1]</code> to advance!
            </p>

            <div className="flex gap-1 overflow-x-auto py-1 my-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                <button
                  key={s}
                  onClick={() => setSeqStep(s)}
                  className={`px-2.5 py-1 rounded font-mono text-xs font-bold transition ${
                    seqStep === s ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Step {s}
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-900 rounded border border-slate-800 text-xs text-slate-300 font-mono">
              {seqStep === 1 && "Step 1: If N7:1 == 1 -> Latch Blue Light (O:0/0), start T4:1 (1s), MOV 2 to N7:1."}
              {seqStep === 2 && "Step 2: If N7:1 == 2 and T4:1.DN -> Latch Green (O:0/1), unlatch Blue, start T4:2, MOV 3 to N7:1."}
              {seqStep === 3 && "Step 3: If N7:1 == 3 and T4:2.DN -> Latch Yellow (O:0/2), unlatch Green, start T4:3, MOV 4 to N7:1."}
              {seqStep === 4 && "Step 4: If N7:1 == 4 and T4:3.DN -> Latch Red (O:0/3), unlatch Yellow, start T4:4, MOV 5 to N7:1."}
              {seqStep >= 5 && `Step ${seqStep}: Lights cycle in combinations. Rung 10 resets all timers and loops back to Step 1.`}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onLoadProgram('micrologix-chaser')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Load Complete Sequencer Project into Simulator
            </button>
          </div>
        </div>
      )
    }
  ];

  const CHALLENGES = [
    {
      id: 'ch-1',
      title: 'Challenge 1: Basic Lamp Control',
      difficulty: 'Beginner',
      prompt: 'Program Rung 0 so that flipping Switch 1 (I:0/0) directly illuminates Amber Lamp 1 (O:0/0).',
      solutionRungs: [
        {
          id: 'ch1_r0',
          comment: 'Challenge 1: Switch 1 to Amber Lamp',
          items: [
            { id: 'c1_i0', type: 'XIC', operand: 'I:0/0', desc: 'Switch 1' },
            { id: 'c1_o0', type: 'OTE', operand: 'O:0/0', desc: 'Amber Lamp' }
          ]
        }
      ]
    },
    {
      id: 'ch-2',
      title: 'Challenge 2: Inverted Logic Interlock',
      difficulty: 'Beginner',
      prompt: 'Using Examine If Open (XIO), make Blue Lamp (O:0/1) turn ON when Switch 1 is OFF, and turn OFF when Switch 1 is ON.',
      solutionRungs: [
        {
          id: 'ch2_r0',
          comment: 'Challenge 2: Inverted logic with XIO',
          items: [
            { id: 'c2_i0', type: 'XIO', operand: 'I:0/0', desc: 'Normally Closed Switch' },
            { id: 'c2_o0', type: 'OTE', operand: 'O:0/1', desc: 'Blue Lamp' }
          ]
        }
      ]
    },
    {
      id: 'ch-3',
      title: 'Challenge 3: Motor Start/Stop Seal-In',
      difficulty: 'Intermediate',
      prompt: 'Load the 3-wire seal-in circuit: Start PB (I:0/2) in parallel with Motor auxiliary contact (O:0/0), in series with Stop PB (I:0/3).',
      solutionRungs: [
        {
          id: 'ch3_r0',
          comment: 'Challenge 3: Motor seal-in parallel split',
          items: [
            {
              id: 'ch3_split',
              type: 'SPLIT',
              branches: [
                [{ id: 'b_start', type: 'XIC', operand: 'I:0/2', desc: 'Start PB' }],
                [{ id: 'b_seal', type: 'XIC', operand: 'O:0/0', desc: 'Motor Aux' }]
              ]
            },
            { id: 'b_stop', type: 'XIO', operand: 'I:0/3', desc: 'Stop PB' },
            { id: 'b_mot', type: 'OTE', operand: 'O:0/0', desc: 'Motor Contactor' }
          ]
        }
      ]
    }
  ];

  const currentChallenge = CHALLENGES[selectedChallengeIdx];

  return (
    <div className="flex flex-col bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl flex-1 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">
            Ladder Logic Learning Lab
          </h2>
        </div>

        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveModule('lessons')}
            className={`px-3 py-1 rounded transition ${
              activeModule === 'lessons' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Slide Lessons
          </button>
          <button
            onClick={() => setActiveModule('challenges')}
            className={`px-3 py-1 rounded transition ${
              activeModule === 'challenges' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Practice Challenges
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {activeModule === 'lessons' && (
          <>
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-slate-950/60 border-r border-slate-800 p-2.5 space-y-1.5 overflow-y-auto">
              {LESSONS.map(l => {
                const Icon = l.icon;
                const isSelected = selectedLessonId === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLessonId(l.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200'
                        : 'border-slate-800/80 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{l.title}</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{l.subtitle}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Lesson Body */}
            <div className="flex-1 p-5 overflow-y-auto max-h-[580px]">
              {LESSONS.find(l => l.id === selectedLessonId)?.content}
            </div>
          </>
        )}

        {activeModule === 'challenges' && (
          <>
            <div className="w-full md:w-64 bg-slate-950/60 border-r border-slate-800 p-2.5 space-y-1.5 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase text-slate-500 block px-1 mb-1">
                Progressive Challenges
              </span>
              {CHALLENGES.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChallengeIdx(idx)}
                  className={`w-full text-left p-2.5 rounded-lg border transition ${
                    selectedChallengeIdx === idx
                      ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200'
                      : 'border-slate-800 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-mono text-cyan-400 block mb-0.5">{ch.difficulty}</span>
                  <span className="text-xs font-bold text-slate-200 block">{ch.title}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[580px]">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-2">{currentChallenge.title}</h3>
                <p className="text-sm text-slate-300 mb-4">{currentChallenge.prompt}</p>

                <button
                  onClick={() => onApplyChallengeSolution(currentChallenge.solutionRungs)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Load Challenge Logic into Simulator
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
