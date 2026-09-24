# RSLogix 500 PLC Simulator & Interactive Hardware Trainer

A modern, high-fidelity browser-based Ladder Logic Simulator inspired by Rockwell Automation's **RSLogix 500** and the **Allen-Bradley MicroLogix 1000** platform. Built with React 19, Vite, and Tailwind CSS.

Designed for industrial automation education, laboratory training, and hands-on ladder logic mastery.

---

## 🚀 Live Demo & GitHub Pages Hosting

This repository is pre-configured for automated **GitHub Pages** deployment via GitHub Actions.

### Quick GitHub Pages Setup (3 Steps):
1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of RSLogix 500 Simulator"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. **Enable GitHub Pages**:
   - In your GitHub repo, go to **Settings > Pages**.
   - Under **Build and deployment > Source**, select **GitHub Actions**.
3. **Live App**:
   - The workflow in `.github/workflows/deploy.yml` will automatically build and publish the application to:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

*(See [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) for full deployment details).*

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation & Launch
```bash
# 1. Clone repository
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

To build the static distribution:
```bash
npm run build
```
The optimized production bundle will be generated in `dist/` with relative asset links (`base: './'`).

---

## 🛠 Features & Capabilities

### 1. Authentic Hardware Trainer Bench
- **MicroLogix 1000 Controller Faceplate**:
  - Live status LEDs: `POWER` (Green), `RUN` (Green), `FAULT` (Red), `FORCE` (Amber).
  - Active input/output LEDs (`IN 0..3`, `OUT 0..3`).
- **Interactive I/O Station**:
  - **4 Pilot Lamps**: `O:0/0` (Amber), `O:0/1` (Blue), `O:0/2` (Green), `O:0/3` (Red).
  - **2 Toggle Switches**: `I:0/0` (Switch 1) and `I:0/1` (Switch 2).
  - **2 Momentary Pushbuttons**: `I:0/2` (Green PB1 / Start) and `I:0/3` (Red PB2 / Stop) with global release listeners.

### 2. Comprehensive Ladder Logic Editor & Math Blocks
- **Instruction Palette**: Categorized tabs for *Bit Instructions*, *Math & Compute*, *Inputs*, *Outputs*, *Internal Relay (B3)*, and *Timers & Registers*.
- **RSLogix 500 Instruction Set**:
  - `-[ ]-` **XIC** (Examine If Closed / Normally Open)
  - `-[/]-` **XIO** (Examine If Open / Normally Closed)
  - `-( )-` **OTE** (Output Energize)
  - `-(L)-` **OTL** (Output Latch)
  - `-(U)-` **OTU** (Output Unlatch)
  - `[TON]` **TON** (Timer On Delay) with authentic RSLogix broken-line header, `Timer`, `Time Base`, `Preset <`, `Accum <`, and `(EN)` / `(DN)` terminals.
  - `-(RES)-` **RES** (Reset Timer)
  - `[ADD]` **ADD** (Math: `Dest = Source A + Source B`) with live evaluated values.
  - `[SUB]` **SUB** (Math: `Dest = Source A - Source B`) with live evaluated values.
  - `[MUL]` **MUL** (Math: `Dest = Source A * Source B`).
  - `[DIV]` **DIV** (Math: `Dest = Source A / Source B`).
  - `[MOV]` **MOV** (Move register value to destination).
  - `[+]` **Parallel Branches**: Multi-level branching for OR logic and motor seal-in circuits.
- **Drag-and-Drop & 1-Click Assignment**: Drag I/O tokens or instructions directly onto contacts, or click any instruction to open the quick address picker.
- **Keyboard Shortcuts**:
  - `Delete` / `Backspace`: Remove selected instruction or rung.
  - `Ctrl+C` / `Cmd+C`: Copy selected instruction or rung.
  - `Ctrl+X` / `Cmd+X`: Cut selected instruction or rung.
  - `Ctrl+V` / `Cmd+V`: Paste instruction or rung (with recursive unique ID generation).

### 3. Data Table Monitor (1/0 Bit Watch Drawer)
- **Sidebar Pullout Drawer**: Click **"Bit Monitor (1/0)"** on the header toolbar.
- **Live 1/0 Bit Display**:
  - `I:0/0` through `I:0/7` with live 1/0 pills and click-to-toggle capability for real-time debugging.
  - `O:0/0` through `O:0/7` with active glow indicators.
  - `B3:0/0` through `B3:0/15` with a 16-bit binary word visualization.
  - `T4:0` through `T4:4` timers with `EN`, `TT`, `DN` status and live animated progress bars.
  - `N7:0` through `N7:15` integer registers with live inline value editing.

### 4. Fully Mobile-Friendly & Responsive Layout
- **Smartphone & Tablet Optimized**: Adapts to any screen size (iPhone, iPad, Android).
- **Mobile View Switcher**: On screens smaller than desktop, a 1-tap switcher allows flipping between **`🪜 Ladder Logic Canvas`** and **`🎛️ Hardware Bench`** with full screen real estate.
- **Touch-Friendly Controls**: Large tap targets with global touch release listeners.

### 5. Real-Time Scan Engine & Validator
- Authentic 4-phase cyclic PLC scan cycle (Overhead -> Input Scan -> Logic Execution -> Output Update).
- Real-time diagnostic validator reporting actionable errors and warnings:
  - Empty rungs or empty split branches.
  - Missing or illegal operand addresses.
  - Physical input overwrite protection (preventing coils from driving `I:0/x`).
  - Slide 23 double-coiling precedence warnings.

### 6. Guided Spotlight Walkthrough & Learning Tab
- Crystal-clear spotlight tutorial highlighting core simulator controls without obscuring UI elements.
- Learning Lab with pre-built example circuits (3-Wire Motor Seal-In, Latch/Unlatch, Sequencer, Timer Cascade) and 1-click loading into the live simulator.

---

## 📁 Repository Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions Pages deployment workflow
├── src/
│   ├── components/             # React UI components (LadderEditor, Trainer, Tutorial)
│   ├── engine/                 # PLC Scan Engine & Diagnostic Validator
│   ├── types/                  # PLC data tables and address normalizer
│   ├── data/                   # Sample ladder logic programs & challenges
│   ├── App.jsx                 # Main application controller
│   └── main.jsx                # React root entry point
├── public/                     # Static assets
├── .gitignore                  # Git ignore rules for clean commits
├── GITHUB_PAGES_SETUP.md       # Step-by-step deployment guide
├── LICENSE                     # MIT License
├── package.json                # Project dependencies and build scripts
├── vite.config.js              # Vite config with relative base './'
└── README.md                   # Project documentation
```

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
