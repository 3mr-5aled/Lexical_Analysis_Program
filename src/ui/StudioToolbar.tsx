import { useState, useRef, useEffect } from "preact/hooks";
import { AUTOMATA_PRESETS, PresetItem } from "../core/registry";
import logoImg from "../assets/logo.png";
import {
  FiMoon,
  FiSun,
  FiDownload,
  FiChevronDown,
  FiCode,
} from "react-icons/fi";

interface StudioToolbarProps {
  selectedPresetId: string;
  onSelectPreset: (preset: PresetItem) => void;
  regexInput: string;
  onChangeRegex: (val: string) => void;
  onCompile: () => void;
  onInsertSymbol: (symbol: string) => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportJflap: () => void;
  onOpenCodeModal: () => void;
  activeStage: "minDfa" | "dfa" | "nfa";
  onChangeStage: (stage: "minDfa" | "dfa" | "nfa") => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function StudioToolbar({
  selectedPresetId,
  onSelectPreset,
  regexInput,
  onChangeRegex,
  onCompile,
  onInsertSymbol,
  onExportSvg,
  onExportPng,
  onExportJflap,
  onOpenCodeModal,
  activeStage,
  onChangeStage,
  isDark,
  onToggleTheme,
}: StudioToolbarProps) {
  const coursePresets = AUTOMATA_PRESETS;

  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isExportOpen]);

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs sticky top-0 z-30 transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Title with Official Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src={logoImg}
            alt="Compiler Automata Studio Logo"
            className="h-9 sm:h-10 w-auto object-contain select-none drop-shadow-xs transition-transform duration-150 hover:scale-105"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Visual Automata Studio
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                FCIS '26
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Interactive RE → Thompson NFA → Subset DFA → Hopcroft Minimization
            </p>
          </div>
        </div>

        {/* Stage Selector Tabs (NFA / DFA / Minimized DFA) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onChangeStage("minDfa")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeStage === "minDfa"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700"
            }`}
          >
            ★ Minimized DFA
          </button>
          <button
            type="button"
            onClick={() => onChangeStage("dfa")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeStage === "dfa"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700"
            }`}
          >
            2. Subset DFA
          </button>
          <button
            type="button"
            onClick={() => onChangeStage("nfa")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeStage === "nfa"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700"
            }`}
          >
            1. Thompson NFA
          </button>
        </div>

        {/* Export & Theme Actions */}
        <div className="flex items-center gap-2">
          {/* Grouped Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              id="btnExportDropdown"
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Export Automata Diagrams & Code"
            >
              <FiDownload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Export</span>
              <FiChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isExportOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1.5 z-50 text-xs flex flex-col">
                <button
                  id="btnExportSvg"
                  type="button"
                  onClick={() => {
                    onExportSvg();
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <span className="font-medium">Vector SVG</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 mono border border-sky-200 dark:border-sky-800">
                    SVG
                  </span>
                </button>

                <button
                  id="btnExportPng"
                  type="button"
                  onClick={() => {
                    onExportPng();
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <span className="font-medium">High-Res PNG</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mono border border-emerald-200 dark:border-emerald-800">
                    PNG
                  </span>
                </button>

                <button
                  id="btnExportJflap"
                  type="button"
                  onClick={() => {
                    onExportJflap();
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <span className="font-medium">JFLAP Diagram</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 mono border border-amber-200 dark:border-amber-800">
                    .JFF
                  </span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                <button
                  id="btnOpenCodeModal"
                  type="button"
                  onClick={() => {
                    onOpenCodeModal();
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-2 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <FiCode className="w-3.5 h-3.5 text-indigo-500" />
                    <span>C# / Mermaid Code</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 mono">
                    MODAL
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Light / Dark Mode"
          >
            {isDark ? (
              <FiMoon className="w-4 h-4 text-sky-400" />
            ) : (
              <FiSun className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* Second Row: Grouped Presets & Regular Expression Input */}
      <div className="max-w-[1600px] mx-auto px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/70 flex flex-wrap items-center gap-3 transition-colors">
        {/* Grouped Preset Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
            📚 Presets:
          </span>
          <select
            id="presetSelector"
            value={selectedPresetId}
            onChange={(e) => {
              const target = e.target as HTMLSelectElement;
              const found = AUTOMATA_PRESETS.find((p) => p.id === target.value);
              if (found) onSelectPreset(found);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 font-medium shadow-xs focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {coursePresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Insert Symbol Chips */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => onInsertSymbol("ε")}
            className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
            title="Insert Epsilon"
          >
            [ + ε ]
          </button>
          <button
            type="button"
            onClick={() => onInsertSymbol("|")}
            className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
            title="Insert Alternation"
          >
            [ | ]
          </button>
          <button
            type="button"
            onClick={() => onInsertSymbol("*")}
            className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
            title="Insert Kleene Star"
          >
            [ * ]
          </button>
          <button
            type="button"
            onClick={() => onInsertSymbol("+")}
            className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
            title="Insert Plus"
          >
            [ + ]
          </button>
          <button
            type="button"
            onClick={() => onInsertSymbol("?")}
            className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
            title="Insert Optional"
          >
            [ ? ]
          </button>
          <button
            type="button"
            onClick={() => onInsertSymbol("()")}
            className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
            title="Insert Parentheses"
          >
            [ ( ) ]
          </button>
        </div>

        {/* Regular Expression Input & Compile Button */}
        <div className="flex-1 min-w-[240px] flex items-center gap-2">
          <input
            type="text"
            value={regexInput}
            onInput={(e) => onChangeRegex((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCompile();
            }}
            placeholder="Enter regular expression (e.g. (ab|ac)* or a|abc*)"
            className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-sky-500 shadow-xs"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onCompile}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>⚡ Compile &amp; Trace</span>
          </button>
        </div>
      </div>
    </header>
  );
}
