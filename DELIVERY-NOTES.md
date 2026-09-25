# Simulator update

Use the source ZIP to update your existing repository. It includes the GitHub Pages workflow and retains the existing branch-editor changes. Use the website ZIP for a static deployment: its index.html and assets directory belong together at the publishing root. No deployment was made to your live site.

## Interface

- Execution controls share a common region; navigation is separate, with visible selected states.
- Mobile editing controls wrap instead of disappearing beyond the screen.
- Consistent focus outlines, readable small labels, keyboard pushbuttons and input toggles, and reduced-motion support.
- Real light surfaces replace whole-screen inversion; lamp colors retain their meaning.
- Monitor closes with Escape and returns focus to its opener.
- Program issues show corrective guidance, including warnings that previously appeared as “Verified OK.”

## Behavior fixes

- New sessions start stopped so the empty program can be edited.
- Editing or changing inputs while stopped does not scan the program.
- Reset clears memory without executing the previous logic again.
- The stop-to-edit control now receives its callback.
- Later rungs see earlier coil writes during the same scan; mixed latch/coil writes follow execution order.
- Invalid timer addresses cannot operate on timer zero; timer timing no longer rounds each scan.
- Coils cannot overwrite physical inputs. Nonfinite register writes are rejected.
- Imports validate structure, limit size/depth, and regenerate identifiers before entering the editor.
- Unsupported ONS/OSR/OSF palette entries are disabled and labeled as unsupported rather than silently acting as wire.

## Verification

Production build passes. Ten automated tests cover engine behavior, bundled example execution, import validation, and address diagnostics. Browser checks cover loading a basic example, run/stop, reset, stopped input behavior, output activation, monitor Escape, and desktop/mobile layouts at 1440, 768, and 390 pixels, with no captured runtime exceptions. Desktop and mobile screenshots were inspected in both themes during development.

Run `npm test`, `npm run build`, and (with the dev server running) `npm run test:browser`. Use Node 22.12+ or Node 24. Tests ran with Node 24.

This is a tested improvement, not a guarantee of zero bugs. The simulator remains an educational approximation; not every instruction combination, browser, screen reader, or physical PLC behavior has been exhaustively validated. Existing examples, learning content, editing tools, and import/export remain available. No user programs are automatically saved; export any work you want to retain.
