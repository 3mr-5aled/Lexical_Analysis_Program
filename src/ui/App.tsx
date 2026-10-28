import { useEffect, useState, useMemo } from "preact/hooks";
import { AUTOMATA_PRESETS, PresetItem } from "../core/registry";
import { AutomataPipeline } from "../core/pipeline";
import { StringTracer } from "../core/tracer";
import { StudioToolbar } from "./StudioToolbar";
import { TapeDebugger } from "./TapeDebugger";
import { CanvasViewport } from "./CanvasViewport";
import { AcademicTableDeck } from "./AcademicTableDeck";
import { ExportModal } from "./ExportModal";
import { ExportPreviewModal } from "./ExportPreviewModal";
import { InspectorCard, CanvasStateNode, CanvasEdge } from "./InspectorCard";
import {
  exportSvgFile,
  exportPngFile,
  exportJflapFile,
} from "../core/export-service";

export function App() {
  const [selectedPreset, setSelectedPreset] = useState<PresetItem>(
    AUTOMATA_PRESETS[0]
  );
  const [regexInput, setRegexInput] = useState<string>(
    AUTOMATA_PRESETS[0].regex
  );
  const [testInput, setTestInput] = useState<string>(
    AUTOMATA_PRESETS[0].defaultInput || "abac"
  );
  const [activeStage, setActiveStage] = useState<"minDfa" | "dfa" | "nfa">(
    "minDfa"
  );
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracer, setTracer] = useState<StringTracer | null>(null);
  const [tapeState, setTapeState] = useState<any>({
    tape: [],
    tapeIndex: 0,
    currentState: "",
    status: "ready",
    reason: "",
  });
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [previewExportType, setPreviewExportType] = useState<
    "svg" | "png" | "jflap" | null
  >(null);

  // Inspector & Interactive Canvas State
  const [selectedItem, setSelectedItem] = useState<{
    type: "state" | "edge";
    id: string;
  } | null>(null);
  const [canvasStates, setCanvasStates] = useState<CanvasStateNode[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdge[]>([]);

  const handleSyncModel = (states: CanvasStateNode[], edges: CanvasEdge[]) => {
    setCanvasStates(states);
    setCanvasEdges(edges);
  };

  const handleUpdateState = (updatedState: CanvasStateNode) => {
    setCanvasStates((prev) =>
      prev.map((s) => (s.id === updatedState.id ? updatedState : s))
    );
  };

  const handleDeleteState = (id: string) => {
    setCanvasStates((prev) => prev.filter((s) => s.id !== id));
    setCanvasEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    setSelectedItem(null);
  };

  const handleUpdateEdge = (updatedEdge: CanvasEdge) => {
    setCanvasEdges((prev) =>
      prev.map((e) => (e.id === updatedEdge.id ? updatedEdge : e))
    );
  };

  const handleDeleteEdge = (id: string) => {
    setCanvasEdges((prev) => prev.filter((e) => e.id !== id));
    setSelectedItem(null);
  };

  const handleQuickAddEdge = (from: string, to: string, label: string) => {
    const sym = label.trim() || "ε";
    const existing = canvasEdges.find((e) => e.from === from && e.to === to);
    if (existing) {
      const existingSymbols = existing.label.split(",").map((s) => s.trim());
      if (!existingSymbols.includes(sym)) {
        const mergedLabel = `${existing.label}, ${sym}`;
        setCanvasEdges((prev) =>
          prev.map((e) =>
            e.id === existing.id ? { ...e, label: mergedLabel } : e
          )
        );
      }
      setSelectedItem({ type: "edge", id: existing.id });
      return;
    }

    const newId = `${from}->${to}_${Date.now()}`;
    const newEdge: CanvasEdge = {
      id: newId,
      from,
      to,
      label: sym,
      curve: from === to ? -45 : 0,
      labelPos: 0.5,
    };
    setCanvasEdges((prev) => [...prev, newEdge]);
    setSelectedItem({ type: "edge", id: newId });
  };

  const handleQuickAddState = (x?: number, y?: number) => {
    const existingIds = new Set(canvasStates.map((s) => s.id));
    const prefix =
      activeStage === "minDfa" || activeStage === "dfa" ? "d" : "q";
    let nextNum = canvasStates.length;
    let newId = `${prefix}${nextNum}`;
    while (existingIds.has(newId)) {
      nextNum++;
      newId = `${prefix}${nextNum}`;
    }

    const newState: CanvasStateNode = {
      id: newId,
      label: newId,
      sub: "",
      isStart: canvasStates.length === 0,
      isAccept: false,
      isTrap: false,
      x: x !== undefined ? Math.round(x) : 450,
      y: y !== undefined ? Math.round(y) : 230,
    };
    setCanvasStates((prev) => [...prev, newState]);
    setSelectedItem({ type: "state", id: newId });
  };

  // Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("compiler_theme");
    if (saved) return saved === "dark";
    return true; // Default to dark mode for compiler studio
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("compiler_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Compile regex pipeline
  const compileAutomata = (reString: string, sampleInput?: string) => {
    try {
      setError(null);
      const res = AutomataPipeline.compile(reString);
      setPipelineResult(res);

      // Initialize tracer with Minimized DFA
      const newTracer = new StringTracer(res.minimizedDfa);
      const currentInput = sampleInput !== undefined ? sampleInput : testInput;
      const initialTape = newTracer.load(currentInput);
      setTracer(newTracer);
      setTapeState(initialTape);
    } catch (err: any) {
      setError(err.message || "Syntax error in regular expression");
    }
  };

  // Compile on mount
  useEffect(() => {
    compileAutomata(selectedPreset.regex, selectedPreset.defaultInput);
  }, []);

  // Handle Preset Selection
  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPreset(preset);
    setRegexInput(preset.regex);
    const defInput = preset.defaultInput || "ab";
    setTestInput(defInput);
    compileAutomata(preset.regex, defInput);
  };

  // Handle Quick Symbol Insert
  const handleInsertSymbol = (symbol: string) => {
    setRegexInput((prev) => prev + symbol);
  };

  // Stepper Handlers
  const handleRun = () => {
    if (tracer) {
      tracer.run();
      setTapeState(tracer.getState());
    }
  };

  const handleStep = () => {
    if (tracer) {
      tracer.step();
      setTapeState(tracer.getState());
    }
  };

  const handleReset = () => {
    if (tracer) {
      tracer.reset();
      setTapeState(tracer.getState());
    }
  };

  const handleChangeTestInput = (newVal: string) => {
    setTestInput(newVal);
    if (tracer) {
      tracer.load(newVal);
      setTapeState(tracer.getState());
    }
  };

  const handleSelectSample = (sampleVal: string) => {
    setTestInput(sampleVal);
    if (tracer) {
      tracer.load(sampleVal);
      setTapeState(tracer.getState());
    }
  };

  // Export Handlers - trigger preview modal before download
  const handleExportSvg = () => {
    setPreviewExportType("svg");
  };

  const handleExportPng = () => {
    setPreviewExportType("png");
  };

  const handleExportJflap = () => {
    setPreviewExportType("jflap");
  };

  // Determine current graph model for canvas viewport - memoized so reference remains stable across renders
  const activeGraphModel = useMemo(() => {
    if (!pipelineResult)
      return { states: [], transitions: [], startState: "", acceptStates: [] };

    if (activeStage === "nfa") {
      const { nfa } = pipelineResult;
      return {
        states: nfa.states.map((id: number) => ({
          id: id.toString(),
          name: id.toString(),
          label: id.toString(),
          isStart: id === nfa.startState,
          isAccept: nfa.acceptStates.includes(id),
        })),
        transitions: nfa.transitions.map((t: any) => ({
          from: t.from.toString(),
          to: t.to.toString(),
          symbol: t.symbol,
        })),
        startState: nfa.startState.toString(),
        acceptStates: nfa.acceptStates.map((s: number) => s.toString()),
      };
    }

    if (activeStage === "dfa") {
      const { dfa } = pipelineResult;
      const transList: Array<{ from: string; to: string; symbol: string }> = [];
      for (const [from, map] of Object.entries(dfa.transitions || {})) {
        for (const [sym, to] of Object.entries(map as Record<string, string>)) {
          transList.push({ from, to, symbol: sym });
        }
      }
      return {
        states: dfa.states.map((s: any) => ({
          id: s.id,
          name: s.id,
          label: s.id,
          sub:
            s.nfaStates && s.nfaStates.length > 1 && s.id !== dfa.trapState
              ? `{${s.nfaStates.join(",")}}`
              : undefined,
          isStart: s.isStart,
          isAccept: s.isAccept,
        })),
        transitions: transList,
        startState: dfa.states.find((s: any) => s.isStart)?.id || "d0",
        acceptStates: dfa.states
          .filter((s: any) => s.isAccept)
          .map((s: any) => s.id),
      };
    }

    // Minimized DFA (Default)
    const { minimizedDfa } = pipelineResult;
    const transList: Array<{ from: string; to: string; symbol: string }> = [];
    for (const [from, map] of Object.entries(minimizedDfa.transitions || {})) {
      for (const [sym, to] of Object.entries(map as Record<string, string>)) {
        transList.push({ from, to, symbol: sym });
      }
    }
    return {
      states: minimizedDfa.states.map((s: any) => ({
        id: s.id,
        name: s.id,
        label: s.id,
        sub: s.label && s.label !== s.id ? s.label : undefined,
        isStart: s.isStart,
        isAccept: s.isAccept,
      })),
      transitions: transList,
      startState: minimizedDfa.states.find((s: any) => s.isStart)?.id || "d0",
      acceptStates: minimizedDfa.states
        .filter((s: any) => s.isAccept)
        .map((s: any) => s.id),
    };
  }, [pipelineResult, activeStage]);
  const stageTitle =
    activeStage === "minDfa"
      ? "★ Minimized DFA (Hopcroft / Equivalence Partitioning)"
      : activeStage === "dfa"
        ? "2. Subset Construction DFA (NFA → DFA)"
        : "1. Thompson's Construction NFA";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 select-none transition-colors">
      {/* Top Studio Toolbar */}
      <StudioToolbar
        selectedPresetId={selectedPreset.id}
        onSelectPreset={handleSelectPreset}
        regexInput={regexInput}
        onChangeRegex={setRegexInput}
        onCompile={() => compileAutomata(regexInput)}
        onInsertSymbol={handleInsertSymbol}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onExportJflap={handleExportJflap}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
        activeStage={activeStage}
        onChangeStage={setActiveStage}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Error Banner */}
      {error && (
        <div className="max-w-[1600px] w-full mx-auto px-4 mt-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-800 dark:text-rose-300 shadow-2xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-sm">⚠️</span> Syntax Error: {error}
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-800 hover:bg-rose-300 dark:hover:bg-rose-700 text-rose-900 dark:text-rose-100 font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-3 flex flex-col gap-3">
        {/* Top Split: Canvas Viewport & Tape Stepper */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* SVG Canvas Viewport (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col">
            <CanvasViewport
              graphModel={activeGraphModel}
              activeStateId={tapeState.currentState}
              stageTitle={stageTitle}
              isDark={isDark}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              onSyncModel={handleSyncModel}
              externalStates={canvasStates}
              externalEdges={canvasEdges}
              onCreateState={handleQuickAddState}
              onCreateTransition={handleQuickAddEdge}
            />
          </div>

          {/* Stepped Tape Debugger & Collapsed Inspector Card (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <TapeDebugger
              testInput={testInput}
              onChangeInput={handleChangeTestInput}
              onRun={handleRun}
              onStep={handleStep}
              onReset={handleReset}
              status={tapeState.status}
              reason={tapeState.reason}
              tape={tapeState.tape}
              tapeIndex={tapeState.tapeIndex}
              acceptedExamples={
                pipelineResult?.simulatorExamples?.accepted || []
              }
              rejectedExamples={
                pipelineResult?.simulatorExamples?.rejected || []
              }
              onSelectSample={handleSelectSample}
            />
            <InspectorCard
              selectedItem={selectedItem}
              states={canvasStates}
              edges={canvasEdges}
              onUpdateState={handleUpdateState}
              onDeleteState={handleDeleteState}
              onUpdateEdge={handleUpdateEdge}
              onDeleteEdge={handleDeleteEdge}
              onQuickAddEdge={handleQuickAddEdge}
              onQuickAddState={handleQuickAddState}
            />
          </div>
        </div>

        {/* Bottom Split: Tabbed Academic Deck */}
        <div className="w-full">
          {pipelineResult && (
            <AcademicTableDeck
              nfa={pipelineResult.nfa}
              subset={{
                intermediateTable: pipelineResult.intermediateTable,
                dfa: pipelineResult.dfa,
              }}
              minimized={{
                equivalenceRounds: pipelineResult.equivalenceRounds,
                minimizedDfa: pipelineResult.minimizedDfa,
              }}
              examples={pipelineResult.simulatorExamples}
              courseSpecNotes={selectedPreset.description}
            />
          )}
        </div>
      </main>

      {/* Footer with Author Credits */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs py-3.5 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-wrap items-center justify-between gap-2.5">
          <div className="font-mono text-[11px] sm:text-xs">
            Visual Automata Studio • Built for FCIS '26 Compiler Theory • 100%
            Offline Standalone
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-400 dark:text-slate-500">
              Created by
            </span>
            <a
              href="https://github.com/3mr-5aled"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition"
            >
              @3mr-5aled
            </a>
            <span className="text-slate-300 dark:text-slate-600">&amp;</span>
            <a
              href="https://github.com/Leklaka-Abdelmoaty"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition"
            >
              @Leklaka-Abdelmoaty
            </a>
          </div>
        </div>
      </footer>

      {/* Export Code Modal */}
      <ExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        graphModel={activeGraphModel}
        minimizedDfa={pipelineResult?.minimizedDfa}
        formalRE={selectedPreset.formalRE || regexInput}
        csharpCode={selectedPreset.csharpCode}
        presetName={selectedPreset.name}
      />

      {/* Export Preview Popup Modal */}
      {previewExportType && (
        <ExportPreviewModal
          isOpen={Boolean(previewExportType)}
          onClose={() => setPreviewExportType(null)}
          exportType={previewExportType}
          presetName={selectedPreset.name}
          isDark={isDark}
          graphModel={activeGraphModel}
        />
      )}
    </div>
  );
}
