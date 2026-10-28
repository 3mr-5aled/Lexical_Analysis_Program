import { useState } from "preact/hooks";

interface AcademicTableDeckProps {
  nfa: any;
  subset: {
    intermediateTable: Array<{
      symbol: string;
      appears: number;
      goesTo: number[];
      isAccept: boolean;
    }>;
    dfa: any;
  };
  minimized: {
    equivalenceRounds: Array<{
      round: number;
      partition: string[][];
      explanations: string[];
    }>;
    minimizedDfa: any;
  };
  examples: {
    accepted: Array<{ string: string; trace?: any[] }>;
    rejected: Array<{ string: string; reason?: string }>;
  };
  courseSpecNotes?: string;
}

export function AcademicTableDeck({
  nfa,
  subset,
  minimized,
  examples,
  courseSpecNotes,
}: AcademicTableDeckProps) {
  const [activeTab, setActiveTab] = useState<
    "nfa" | "subset" | "hopcroft" | "examples" | "theory"
  >("subset");

  const { dfa, intermediateTable } = subset || {
    dfa: null,
    intermediateTable: [],
  };
  const { minimizedDfa, equivalenceRounds } = minimized || {
    minimizedDfa: null,
    equivalenceRounds: [],
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col transition-colors">
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("subset")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "subset"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800"
            }`}
          >
            2. Subset Construction (Intermediate &amp; DFA Tables)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hopcroft")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "hopcroft"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800"
            }`}
          >
            3. Hopcroft Minimization (Rounds &amp; Table)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("nfa")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "nfa"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800"
            }`}
          >
            1. Thompson NFA ({nfa?.states?.length || 0} States)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("examples")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "examples"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800"
            }`}
          >
            4. String Test Vectors (L4 S47)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("theory")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "theory"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800"
            }`}
          >
            📖 Academic Standard (FCIS '26)
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:block">
          FCIS '26 Canonical Formats
        </div>
      </div>

      {/* Tab Contents Deck */}
      <div className="p-4 flex flex-col gap-4 max-h-[500px] overflow-y-auto">
        {/* TAB 1: Thompson NFA */}
        {activeTab === "nfa" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Thompson NFA Transitions ({nfa?.transitions?.length || 0} Total)
              </h3>
              <span className="text-xs font-mono text-sky-700 dark:text-sky-400 font-semibold">
                Start: {nfa?.startState} • Accept:{" "}
                {`{ ${(nfa?.acceptStates || []).join(", ")} }`}
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2">From State</th>
                    <th className="px-3 py-2">Input Symbol</th>
                    <th className="px-3 py-2">To State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {(nfa?.transitions || []).map((t: any, idx: number) => {
                    const isStart = t.from === nfa.startState;
                    const isAccept = nfa.acceptStates.includes(t.to);
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          {isStart && (
                            <span className="text-sky-600 dark:text-sky-400 font-bold mr-1">
                              →
                            </span>
                          )}
                          {t.from}
                        </td>
                        <td className="px-3 py-1.5 font-bold text-sky-700 dark:text-sky-400">
                          {t.symbol}
                        </td>
                        <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          {t.to}
                          {isAccept && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                              *
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Subset Construction & Intermediate Table */}
        {activeTab === "subset" && (
          <div className="flex flex-col gap-5">
            {/* Table A: Intermediate Sigma / Appears / Goes to */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Intermediate Table: Σ / Appears / Goes To
                  <span className="text-sky-700 dark:text-sky-400 font-mono font-semibold ml-2">
                    (FCIS '26 Lab 4 Table Format)
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-sky-50 dark:bg-sky-950/60 text-sky-950 dark:text-sky-200 font-bold border-b border-sky-200 dark:border-sky-800">
                    <tr>
                      <th className="px-3 py-2">Sigma (Σ)</th>
                      <th className="px-3 py-2">Appears In NFA State</th>
                      <th className="px-3 py-2">Goes To {`{ ε-closure }`}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {(intermediateTable || []).map((row: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-3 py-1.5 font-bold text-sky-700 dark:text-sky-400">
                          {row.symbol}
                        </td>
                        <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          {row.appears}
                        </td>
                        <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">
                          {`{ ${row.goesTo.join(", ")} }`}
                          {row.isAccept && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                              *
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table B: Full DFA Transition Table */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Complete DFA Transition Table
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] ml-2 normal-case tracking-normal">
                  (→ = Start State, * = Accept State, φ = Dead/Trap State)
                </span>
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2">DFA State</th>
                      <th className="px-3 py-2">NFA State Subset</th>
                      {(dfa?.alphabet || []).map((sym: string) => (
                        <th key={sym} className="px-3 py-2 font-mono">
                          δ(q, {sym})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {(dfa?.states || []).map((state: any) => {
                      const isTrap = state.id === dfa?.trapState;
                      return (
                        <tr
                          key={state.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100">
                            {state.isStart && (
                              <span className="text-sky-600 dark:text-sky-400 mr-1">
                                →
                              </span>
                            )}
                            <span
                              className={
                                isTrap ? "text-rose-600 dark:text-rose-400" : ""
                              }
                            >
                              {state.id}
                            </span>
                            {state.isAccept && (
                              <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                                *
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                            {isTrap
                              ? "φ"
                              : `{ ${(state.nfaStates || []).join(", ")} }`}
                            {state.isAccept && (
                              <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                                *
                              </span>
                            )}
                          </td>
                          {(dfa?.alphabet || []).map((sym: string) => {
                            const dest =
                              dfa?.transitions?.[state.id]?.[sym] ||
                              dfa?.trapState;
                            const isDestTrap = dest === dfa?.trapState;
                            return (
                              <td
                                key={sym}
                                className={`px-3 py-1.5 font-semibold ${isDestTrap ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"}`}
                              >
                                {dest}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Hopcroft Minimization */}
        {activeTab === "hopcroft" && (
          <div className="flex flex-col gap-5">
            {/* Equivalence Timeline */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                k-Equivalence Partitioning Timeline
              </h3>
              <div className="space-y-2">
                {(equivalenceRounds || []).map((round: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-800 dark:text-sky-300 font-mono">
                        Round {round.round}: {round.round}-Equivalence Partition
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {round.partition.length} Groups
                      </span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {round.partition
                        .map((g: string[]) => `{ ${g.join(", ")} }`)
                        .join("   ")}
                    </div>
                    {(round.explanations || []).map(
                      (exp: string, expIdx: number) => (
                        <div
                          key={expIdx}
                          className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-mono"
                        >
                          • {exp}
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Minimized DFA Table */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Minimized DFA Transition Table
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2">Minimized State</th>
                      <th className="px-3 py-2">Merged Original States</th>
                      {(minimizedDfa?.alphabet || []).map((sym: string) => (
                        <th key={sym} className="px-3 py-2 font-mono">
                          δ(q, {sym})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(minimizedDfa?.states || []).map((state: any) => (
                      <tr
                        key={state.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100">
                          {state.isStart && (
                            <span className="text-sky-600 dark:text-sky-400 mr-1">
                              →
                            </span>
                          )}
                          {state.id}
                          {state.isAccept && (
                            <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                              *
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                          {state.label || state.id}
                        </td>
                        {(minimizedDfa?.alphabet || []).map((sym: string) => {
                          const dest =
                            minimizedDfa?.transitions?.[state.id]?.[sym] ||
                            minimizedDfa?.trapState;
                          return (
                            <td
                              key={sym}
                              className="px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200"
                            >
                              {dest}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: String Simulator Examples */}
        {activeTab === "examples" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Accepted Strings Card */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex flex-col gap-2">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                <span>✓</span> 3 Example Accepted Strings (Lecture 4 Slide 47)
              </div>
              <div className="space-y-1.5">
                {(examples?.accepted || []).map((ex: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/70 shadow-2xs font-mono text-xs"
                  >
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      "{ex.string === "" ? "ε" : ex.string}"
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 ml-2">
                      → Accepted
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejected Strings Card */}
            <div className="bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl p-4 flex flex-col gap-2">
              <div className="font-bold text-rose-800 dark:text-rose-300 text-xs flex items-center gap-1.5">
                <span>✗</span> 3 Example Rejected Strings (Lecture 4 Slide 47)
              </div>
              <div className="space-y-1.5">
                {(examples?.rejected || []).map((ex: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800/70 shadow-2xs font-mono text-xs"
                  >
                    <span className="font-bold text-rose-900 dark:text-rose-200">
                      "{ex.string === "" ? "ε" : ex.string}"
                    </span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 ml-2">
                      → {ex.reason || "Terminated in non-accepting state"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Course Theory & Reference Notes */}
        {activeTab === "theory" && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              FCIS '26 Compiler Theory Standard (material/knowledge/)
            </h4>
            <p>
              This studio strictly implements the formal algorithms taught in
              FCIS '26 Compiler Architecture (Lectures 1–4, Labs 1–4):
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-slate-800 dark:text-slate-200">
              <li>
                <strong>Thompson's Construction:</strong> Single start state,
                single accept state, inductive fragment composition for
                concatenation, union, and Kleene star.
              </li>
              <li>
                <strong>Intermediate Table:</strong> Explicit table recording Σ
                symbol appearances and corresponding ε-closure targets prior to
                subset generation.
              </li>
              <li>
                <strong>Hopcroft Minimization:</strong> 0-Equivalence
                partitioning into non-accepting and accepting sets, split
                testing on input symbols until convergence.
              </li>
              <li>
                <strong>Sink/Trap State (φ):</strong> Explicit dead state
                handling for illegal transitions, maintaining complete
                deterministic transition tables.
              </li>
            </ul>
            {courseSpecNotes && (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 mt-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
                  Preset Notes:
                </span>
                {courseSpecNotes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
