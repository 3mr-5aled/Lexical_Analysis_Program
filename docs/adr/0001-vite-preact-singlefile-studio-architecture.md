# ADR 0001: Vite + Preact + Tailwind Single-File Studio Architecture

**Date:** 2026-10-28  
**Status:** Accepted  
**Supersedes:** `docs/2026-10-24-compiler-automata-interactive-design.md` §4 (Approach 3 rejection)

---

## Context

The initial application architecture used vanilla JavaScript with direct imperative DOM mutations in `js/app.js` (588 lines) and a custom build script (`build.js`) using regex string replacement to concatenate scripts for offline execution.

While this satisfied the initial constraint of being able to double-click `index.html` via `file://`, it created severe architectural friction:

1. `app.js` is an entangled shallow module leaking across 30+ DOM nodes with manual string generation and fragile event binding.
2. Extending the visualizer to include the polished interactive studio features from `material/interactive_dfa_studio_c_lexical_analyzer.html` (interactive tape debugger, state dragging, bezier curve handles, property inspector, live table/graph sync) would cause exponential code sprawl without reactive components.
3. The original ADR rejected frameworks (React/Vue) assuming they would require a Node.js runtime for end users.

## Decision

We adopt a modern, lightweight, dual-purpose architecture:

1. **Toolchain & Build Seam:** **Vite** coupled with **`vite-plugin-singlefile`** and `base: './'`.
   - Running `npm run build` compiles TypeScript (`src/`), Preact JSX, Tailwind CSS, and SVG assets into a single self-contained `dist/index.html`.
   - This single file runs 100% offline via local `file://` double-click (zero CORS issues) AND deploys seamlessly to static hosting (GitHub Pages, Vercel, Netlify) with zero configuration.
2. **UI Framework:** **Preact + TypeScript + Tailwind CSS** (~3KB runtime footprint).
   - Replaces manual DOM queries with declarative components and reactive state.
   - Restructures UI into a Studio Split Workspace matching `interactive_dfa_studio_c_lexical_analyzer.html`.
3. **Core Automata Engine Seam:** **`AutomataPipeline`** (`src/core/`).
   - The scientific compiler algorithms (Thompson's Construction, Subset Construction with the Intermediate Table, Hopcroft Minimization, and String Simulation) remain pure, headless TypeScript with zero framework/DOM dependencies.
   - Strictly conforms to `material/knowledge/` (FCIS '26 standards).
4. **Interactive SVG Studio Canvas:** Deep custom SVG component (`AutomataStudioCanvas`) with default collision-free DAG + sink layout, free state dragging, and curve control handles.

## Consequences

- **Positive:**
  - Modern developer experience: Instant Vite HMR, TypeScript compile-time safety, Tailwind utility classes.
  - Retains 100% offline, zero-install student accessibility via `dist/index.html`.
  - Replaces fragile `build.js` string concatenation with standard industry bundling.
  - Decouples scientific automata algorithms (`src/core/`) from UI rendering (`src/ui/`), tested headlessly via automated tests.
- **Negative:**
  - Requires developers to run `npm run build` when making source changes to regenerate `dist/index.html`.
