# Changelog

All notable changes to the **Visual Automata Studio** (Compiler Theory & Lexical Analysis) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-28

### 🚀 Production Release Milestone (FCIS '26)

#### Added

- **Export Preview Modal (`ExportPreviewModal.tsx`)**:
  - Live interactive rendering of the diagram before downloading.
  - Supports Vector SVG, High-Resolution PNG ($2\times$ to $3\times$ scale), and JFLAP 7.x (`.jff`) XML.
  - Displays real-time metadata: dimensions (e.g., $2600\times1570\text{ px}$), target file name, format badges, and watermark status indicator.
  - Interactive "Download File" and "Cancel" buttons.
- **Watermark & Credits System**:
  - Constant design `[ logo + name of the app ]` (`Automata Studio`) placed in the bottom-right corner of exported images.
  - Configurable toggle via hardcoded config file [`src/config/export.config.ts`](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/src/config/export.config.ts) (`{ watermark: true }`). Setting to `false` cleanly removes the watermark.
  - High-res embedded SVG logo image and crisp typography matching light and dark themes.
- **Progressive Web App (PWA) & Offline Capability**:
  - Web App Manifest (`public/manifest.webmanifest`) configured with `display: standalone`, custom theme colors, and multi-size icons.
  - Offline-first Service Worker (`public/sw.js`) implementing cache-first asset caching for zero-network operation.
  - Mobile meta tags (`apple-mobile-web-app-capable`, `theme-color`, `apple-touch-icon`).
- **Responsive Layout for Mobile & Tablet**:
  - Flexible layout down to $360\text{ px}$ viewports without horizontal clipping.
  - Touch-friendly symbol chip bar with horizontal smooth scrolling (`overflow-x-auto`).
  - Vertically stacked canvas and debugger cards on viewports $<1024\text{ px}$.
- **Ascending Academic Course Catalog**:
  - Strictly organized ascendingly by course progression:
    1. **Lecture 3**: Identifiers `(a|b)(a|b|0|1)*`
    2. **Lab 3 - Ex 1**: `(ab|c)*`
    3. **Lab 3 - Ex 2**: `(a|b)*a`
    4. **Lab 3 - Self Study**: `a*b(a|b)*`
    5. **Lecture 4 - Slide 47**: `a|abc*`
    6. **Lab 4 - Ex 1**: `(ab|ac)*`
    7. **Lab 4 - Ex 2**: `(a|b)*a(a|b|ε)`
    8. **Lab 4 - Ex 3**: `(ba)+(a*b*|a*)`
- **Automated Verification Suite**:
  - Reached **59/59 passing unit and end-to-end browser tests** across CDP headless Edge, including canvas performance, export verification, and mobile responsiveness.

#### Fixed

- **Canvas Tainting on `file:///`**:
  - Resolved Chromium canvas tainting when loading SVGs via blob URLs on `file:///` origins by leveraging safe inline data URIs (`data:image/svg+xml;charset=utf-8,`).
- **NaN Bounding Box Poisoning**:
  - Guarded all analytical coordinate bounds against uninitialized edge positions with `Number.isFinite(...)` to ensure positive canvas dimensions.
- **Dark Mode Table Deck Background**:
  - Replaced non-standard `dark:bg-slate-850` with Tailwind-compliant `dark:bg-slate-800/80` in `AcademicTableDeck.tsx` and `ExportModal.tsx`.
- **Canvas Interactive Freezing**:
  - Resolved ping-pong re-render loops between `App.tsx` and `CanvasViewport.tsx` using `useMemo` reference stability and layout effect diff guards.

---

## [0.3.0] - 2026-10-28

### Interactive Canvas & Graph Engine

#### Added

- **Dynamic State & Transition Creation**:
  - Added `+ State` and `+ Transition` canvas controls.
  - Supported double-clicking canvas SVG to spawn new states at exact click coordinates.
  - Transition creation modal with automatic symbol merging for duplicate source/target pairs.
- **Curved Bezier Routing & Clearance**:
  - Outer clearance lane routing for error/trap transitions.
  - Distinct perimeter fan-in ports for incoming edges to sink states.
  - Inward/outward normal offsets for self-loop labels.
- **Interactive State Inspector**:
  - Panel to inspect, rename, reposition, and toggle start/accept states.

---

## [0.2.0] - 2026-10-28

### Academic Equivalence & Stepped Simulator

#### Added

- **Academic Table Deck (`AcademicTableDeck.tsx`)**:
  - 0-Equivalence and 1-Equivalence partitioning tables with human-readable split explanations.
  - Appears / Goes-to intermediate transition table for Lab 4.
  - Subset construction transition table with clean state group labels.
- **String Simulator & Tape Stepper (`TapeDebugger.tsx`)**:
  - Character-by-character interactive stepping tape.
  - Real-time active state ring and arrow traversal highlights.
  - Pre-populated course examples (3 accepted and 3 rejected strings).

---

## [0.1.0] - 2026-10-28

### Core Automata Architecture

#### Added

- **Thompson's Construction Engine**:
  - Regular expression parser with operator precedence (`*`, `+`, `?`, concatenation, union `|`).
  - Generation of non-deterministic finite automata with $\varepsilon$-transitions.
- **Subset Construction Engine**:
  - $\varepsilon$-closure computation and DFA state determination.
- **Hopcroft's Minimization Algorithm**:
  - Partition refinement and dead-state elimination.
- **Single-File Bundler**:
  - Inlines all HTML, CSS, JavaScript, and assets into a standalone `dist/index.html`.
