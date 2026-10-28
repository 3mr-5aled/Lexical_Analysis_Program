interface TapeDebuggerProps {
  testInput: string;
  onChangeInput: (val: string) => void;
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
  status: "ready" | "running" | "accepted" | "rejected";
  reason: string;
  tape: string[];
  tapeIndex: number;
  acceptedExamples: { string: string; trace?: any[] }[];
  rejectedExamples: { string: string; reason?: string }[];
  onSelectSample: (val: string) => void;
}

export function TapeDebugger({
  testInput,
  onChangeInput,
  onRun,
  onStep,
  onReset,
  status,
  reason,
  tape,
  tapeIndex,
  acceptedExamples,
  rejectedExamples,
  onSelectSample,
}: TapeDebuggerProps) {
  const getBadgeClass = () => {
    switch (status) {
      case "accepted":
        return "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      case "rejected":
        return "bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      case "running":
        return "bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col gap-2.5 transition-colors">
      {/* Top Input & Stepper Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            Test Lexeme:
          </span>
          <div className="flex-1 relative">
            <input
              type="text"
              value={testInput}
              onInput={(e) =>
                onChangeInput((e.target as HTMLInputElement).value)
              }
              placeholder="Type string to simulate..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="btnRunTape"
            type="button"
            onClick={onRun}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition flex items-center gap-1 cursor-pointer"
          >
            ▶ Run
          </button>
          <button
            id="btnStepTape"
            type="button"
            onClick={onStep}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition flex items-center gap-1 cursor-pointer"
          >
            ⏭ Step
          </button>
          <button
            id="btnResetTape"
            type="button"
            onClick={onReset}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
            title="Reset Simulation"
          >
            ⏹
          </button>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold border mono uppercase ${getBadgeClass()}`}
          >
            {status}
          </div>
        </div>
      </div>

      {/* Input Tape Display */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-lg">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Input Tape:
          </span>
          <div className="flex items-center gap-1 mono text-xs font-bold">
            {tape.length === 0 ? (
              <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300 shadow-2xs">
                [ ε (empty string) ]
              </span>
            ) : (
              tape.map((char, idx) => {
                const isCurrent = idx === tapeIndex;
                const isPassed = idx < tapeIndex;
                return (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded transition border ${
                      isCurrent
                        ? "bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-300 dark:ring-sky-700 scale-105"
                        : isPassed
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {char}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* Step Explanation Banner */}
        <div className="text-xs text-sky-900 dark:text-sky-300 font-semibold mono">
          {reason || "Ready to trace string execution."}
        </div>
      </div>

      {/* Quick Lecture 4 Slide 47 Sample Vector Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            ✓ Accepted:
          </span>
          {acceptedExamples.slice(0, 3).map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectSample(ex.string)}
              className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mono text-xs transition cursor-pointer font-semibold shadow-2xs"
            >
              "{ex.string === "" ? "ε" : ex.string}"
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
            ✗ Rejected:
          </span>
          {rejectedExamples.slice(0, 3).map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectSample(ex.string)}
              className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mono text-xs transition cursor-pointer font-semibold shadow-2xs"
            >
              "{ex.string === "" ? "ε" : ex.string}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
