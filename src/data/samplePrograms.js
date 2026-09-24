// Sample PLC Programs directly mapped to course slides and hardware trainer

export const SAMPLE_PROGRAMS = [
  {
    id: 'basic-direct',
    name: '1. Basic Direct Wiring (Switch to Lamp)',
    description: 'Each switch directly controls a pilot lamp. Flip switches on the trainer to test!',
    rungs: [
      {
        id: 'r0',
        comment: 'Rung 0: Switch 1 (I:0/0) turns ON Amber Lamp 1 (O:0/0)',
        items: [
          { id: 'r0_i0', type: 'XIC', operand: 'I:0/0', desc: 'Switch 1' },
          { id: 'r0_o0', type: 'OTE', operand: 'O:0/0', desc: 'Amber Lamp 1' }
        ]
      },
      {
        id: 'r1',
        comment: 'Rung 1: Switch 2 (I:0/1) turns ON Blue Lamp 2 (O:0/1)',
        items: [
          { id: 'r1_i0', type: 'XIC', operand: 'I:0/1', desc: 'Switch 2' },
          { id: 'r1_o0', type: 'OTE', operand: 'O:0/1', desc: 'Blue Lamp 2' }
        ]
      },
      {
        id: 'r2',
        comment: 'Rung 2: Green Button (I:0/2) turns ON Green Lamp 3 (O:0/2)',
        items: [
          { id: 'r2_i0', type: 'XIC', operand: 'I:0/2', desc: 'Green Button' },
          { id: 'r2_o0', type: 'OTE', operand: 'O:0/2', desc: 'Green Lamp 3' }
        ]
      }
    ]
  },
  {
    id: 'motor-start-stop',
    name: '2. Motor Start/Stop Seal-In (Parallel Split) (Slides 31-33)',
    description: 'Press Green Button (I:0/2) to start. Contactor O:0/0 seals power in parallel. Press Red Button (I:0/3) to stop.',
    rungs: [
      {
        id: 'r0',
        comment: 'Motor Seal-In: Green PB (I:0/2) in parallel with Motor contact (O:0/0), in series with Stop PB (I:0/3).',
        items: [
          {
            id: 'r0_split',
            type: 'SPLIT',
            branches: [
              [{ id: 'b_start', type: 'XIC', operand: 'I:0/2', desc: 'Start PB' }],
              [{ id: 'b_seal', type: 'XIC', operand: 'O:0/0', desc: 'Motor Aux Seal-In' }]
            ]
          },
          { id: 'r0_stop', type: 'XIO', operand: 'I:0/3', desc: 'Stop PB' },
          { id: 'r0_mot', type: 'OTE', operand: 'O:0/0', desc: 'Motor Contactor' }
        ]
      }
    ]
  },
  {
    id: 'or-gate',
    name: '3. OR Gate (Parallel Split Branch) (Slide 20)',
    description: 'Amber Lamp (O:0/0) turns ON if Switch 1 (I:0/0) OR Switch 2 (I:0/1) is flipped ON.',
    rungs: [
      {
        id: 'r0',
        comment: 'OR Gate: Switch 1 and Switch 2 are wired in a parallel split branch.',
        items: [
          {
            id: 'r0_split',
            type: 'SPLIT',
            branches: [
              [{ id: 'b1', type: 'XIC', operand: 'I:0/0', desc: 'Switch 1' }],
              [{ id: 'b2', type: 'XIC', operand: 'I:0/1', desc: 'Switch 2' }]
            ]
          },
          { id: 'r0_lamp', type: 'OTE', operand: 'O:0/0', desc: 'Amber Lamp 1' }
        ]
      }
    ]
  },
  {
    id: 'logic-gates-demo',
    name: '4. AND Gate (Series Contacts) (Slide 19)',
    description: 'Amber Lamp 1 turns ON only when BOTH Switch 1 (I:0/0) AND Switch 2 (I:0/1) are ON.',
    rungs: [
      {
        id: 'r0',
        comment: 'AND Gate: Series contacts require both I:0/0 AND I:0/1 to be closed.',
        items: [
          { id: 'r0_i0', type: 'XIC', operand: 'I:0/0', desc: 'Switch 1' },
          { id: 'r0_i1', type: 'XIC', operand: 'I:0/1', desc: 'Switch 2' },
          { id: 'r0_o0', type: 'OTE', operand: 'O:0/0', desc: 'Amber Lamp 1' }
        ]
      }
    ]
  },
  {
    id: 'timer-ton',
    name: '5. Timer On-Delay (TON) (Slides 16-18)',
    description: 'Switch 1 starts TON Timer T4:0 (5s). When done (.DN), Blue Lamp (O:0/1) illuminates.',
    rungs: [
      {
        id: 'r0',
        comment: 'Rung 0: Switch 1 starts TON Timer T4:0 (Time Base 1.0s, Preset 5)',
        items: [
          { id: 'r0_i0', type: 'XIC', operand: 'I:0/0', desc: 'Switch 1' },
          { id: 'r0_t0', type: 'TON', operand: 'T4:0', params: { pre: 5, timeBase: 1.0 } }
        ]
      },
      {
        id: 'r1',
        comment: 'Rung 1: When T4:0 is Done (.DN), turn ON Blue Lamp (O:0/1)',
        items: [
          { id: 'r1_i0', type: 'XIC', operand: 'T4:0.DN', desc: 'Timer Done' },
          { id: 'r1_o0', type: 'OTE', operand: 'O:0/1', desc: 'Blue Lamp 2' }
        ]
      }
    ]
  },
  {
    id: 'micrologix-chaser',
    name: '6. MicroLogix Sequencer (Slides 34-47 Project)',
    description: 'The 11-step sequential light project from class using EQU, MOV, and timers to cycle lights.',
    rungs: [
      {
        id: 'r0',
        comment: 'Rung 0: Switch 1 (I:0/0) writes MOV 1 to N7:1 to start sequence.',
        items: [
          { id: 'r0_i0', type: 'XIC', operand: 'I:0/0', desc: 'Switch 1' },
          { id: 'r0_o0', type: 'MOV', operand: '1', params: { source: '1', dest: 'N7:1' } }
        ]
      },
      {
        id: 'r1',
        comment: 'Rung 1: If N7:1 == 1, turn ON Amber Lamp (O:0/0), start T4:1 (1s), and advance to Step 2.',
        items: [
          { id: 'r1_i0', type: 'EQU', operand: 'N7:1', params: { sourceA: 'N7:1', sourceB: 1 } },
          { id: 'r1_o0', type: 'OTL', operand: 'O:0/0', desc: 'Amber Lamp' },
          { id: 'r1_o1', type: 'TON', operand: 'T4:1', params: { pre: 1.0 } },
          { id: 'r1_o2', type: 'MOV', operand: '2', params: { source: '2', dest: 'N7:1' } }
        ]
      },
      {
        id: 'r2',
        comment: 'Rung 2: If N7:1 == 2 and T4:1 Done, turn ON Blue Lamp (O:0/1), turn OFF Amber, start T4:2, advance to Step 3.',
        items: [
          { id: 'r2_i0', type: 'EQU', operand: 'N7:1', params: { sourceA: 'N7:1', sourceB: 2 } },
          { id: 'r2_i1', type: 'XIC', operand: 'T4:1.DN', desc: 'T4:1 Done' },
          { id: 'r2_o0', type: 'OTL', operand: 'O:0/1', desc: 'Blue Lamp' },
          { id: 'r2_o1', type: 'OTU', operand: 'O:0/0', desc: 'Amber Lamp' },
          { id: 'r2_o2', type: 'TON', operand: 'T4:2', params: { pre: 1.0 } },
          { id: 'r2_o3', type: 'MOV', operand: '3', params: { source: '3', dest: 'N7:1' } }
        ]
      },
      {
        id: 'r3',
        comment: 'Rung 3: Reset sequence when Green PB (I:0/2) is pressed.',
        items: [
          { id: 'r3_i0', type: 'XIC', operand: 'I:0/2', desc: 'Green PB' },
          { id: 'r3_o0', type: 'OTU', operand: 'O:0/0', desc: 'Amber' },
          { id: 'r3_o1', type: 'OTU', operand: 'O:0/1', desc: 'Blue' },
          { id: 'r3_o2', type: 'MOV', operand: '0', params: { source: '0', dest: 'N7:1' } }
        ]
      }
    ]
  }
];
