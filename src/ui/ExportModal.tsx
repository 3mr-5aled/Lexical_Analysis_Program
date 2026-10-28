import { useState } from "preact/hooks";
import {
  generateMermaidCode,
  generateCsharpCode,
} from "../core/export-service";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphModel?: any;
  minimizedDfa?: any;
  formalRE: string;
  csharpCode?: string;
  presetName?: string;
}

export function ExportModal({
  isOpen,
  onClose,
  graphModel,
  minimizedDfa,
  formalRE,
  csharpCode,
  presetName,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<"mermaid" | "csharp">("mermaid");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetModel = graphModel || minimizedDfa;
  const mermaidCode = targetModel
    ? generateMermaidCode(targetModel)
    : "// No DFA compiled";
  const csharpSnippet =
    csharpCode ||
    (targetModel
      ? generateCsharpCode(targetModel, presetName || formalRE)
      : `// Lexical Scanner Token Matcher\n// RE: ${formalRE}`);

  const currentContent = activeTab === "mermaid" ? mermaidCode : csharpSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              Export Automata Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {presetName || formalRE}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("mermaid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "mermaid"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Mermaid Diagram Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("csharp")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "csharp"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              C# Scanner DFA
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
          </button>
        </div>

        {/* Modal Code Body */}
        <div className="p-5 flex-1 overflow-y-auto bg-slate-950">
          <pre className="text-xs mono text-emerald-400 leading-relaxed font-mono select-text whitespace-pre-wrap">
            {currentContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
