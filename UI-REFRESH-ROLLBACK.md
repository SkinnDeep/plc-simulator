# UI refresh rollback

Original clean working tree: `386e5d1756ca23274ad7793f2eeeee9dbe9d3763`.
An additional original-source archive is saved locally at `scratch/ui-original/original.zip`.

When the user asks to restore the original, restore only the files below from this revision, first checking for any later edits that must be preserved. Do not reset the entire repository or delete saved browser programs.

- index.html
- src/App.jsx
- src/index.css
- src/components/Header.jsx
- src/components/HardwareTrainer.jsx
- src/components/LadderEditor.jsx
- src/components/BitMonitorDrawer.jsx
- src/components/InstructionPalette.jsx
- src/components/LearningTab.jsx
- tests/browser.cjs
- artifacts/desktop-dark.png
- artifacts/desktop-light.png
- artifacts/mobile-390.png
- artifacts/mobile-768.png

The refresh also adds this note and `artifacts/mobile-320.png` and `artifacts/mobile-bench.png`. Those files can be removed on rollback. No packages were added or updated.

Validation: engine tests, production build, and browser workflow checks including 320/390/768/1440px layouts, touch controls, reduced motion, and invalid autosave recovery. Browser tests use an isolated temporary profile, not the user's saved programs.

Reference-driven second pass: the prior state, including the laptop-height fix, is commit `7b799af` and is also archived at `scratch/ui-reference-pass/before.zip`. Use that checkpoint if the user asks to undo only the second pass. The original baseline above remains available for a full original restoration.
