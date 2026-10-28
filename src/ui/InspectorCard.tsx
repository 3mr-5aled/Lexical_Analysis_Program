import { useState, useEffect } from "preact/hooks";
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit3,
  FiPlus,
  FiTrash2,
  FiCheck,
} from "react-icons/fi";

export interface CanvasStateNode {
  id: string;
  label: string;
  sub: string;
  isStart: boolean;
  isAccept: boolean;
  isTrap: boolean;
  x: number;
  y: number;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  curve: number;
  labelPos: number;
}

interface InspectorCardProps {
  selectedItem: { type: "state" | "edge"; id: string } | null;
  states: CanvasStateNode[];
  edges: CanvasEdge[];
  onUpdateState: (state: CanvasStateNode) => void;
  onDeleteState: (id: string) => void;
  onUpdateEdge: (edge: CanvasEdge) => void;
  onDeleteEdge: (id: string) => void;
  onQuickAddEdge: (from: string, to: string, label: string) => void;
  onQuickAddState: () => void;
}

export function InspectorCard({
  selectedItem,
  states,
  edges,
  onUpdateState,
  onDeleteState,
  onUpdateEdge,
  onDeleteEdge,
  onQuickAddEdge,
  onQuickAddState,
}: InspectorCardProps) {
  // Collapsed by default as requested by user
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Auto-expand if user selects a state or edge on the canvas
  useEffect(() => {
    if (selectedItem) {
      setIsCollapsed(false);
    }
  }, [selectedItem]);

  // Quick Add Transition draft state
  const [quickFrom, setQuickFrom] = useState("");
  const [quickTo, setQuickTo] = useState("");
  const [quickLabel, setQuickLabel] = useState("");

  // State Inspector draft state
  const [stateLabel, setStateLabel] = useState("");
  const [stateSub, setStateSub] = useState("");
  const [stateStart, setStateStart] = useState(false);
  const [stateAccept, setStateAccept] = useState(false);
  const [stateTrap, setStateTrap] = useState(false);
  const [stateX, setStateX] = useState(0);
  const [stateY, setStateY] = useState(0);

  // Edge Inspector draft state
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeCurve, setEdgeCurve] = useState(0);
  const [edgeLabelPos, setEdgeLabelPos] = useState(50);

  // Sync draft values when selection or model changes
  useEffect(() => {
    if (!states.length) return;
    if (!quickFrom || !states.some((s) => s.id === quickFrom)) {
      setQuickFrom(states[0].id);
    }
    if (!quickTo || !states.some((s) => s.id === quickTo)) {
      setQuickTo(states[Math.min(1, states.length - 1)].id);
    }
  }, [states, quickFrom, quickTo]);

  useEffect(() => {
    if (!selectedItem) return;

    if (selectedItem.type === "state") {
      const st = states.find((s) => s.id === selectedItem.id);
      if (st) {
        setStateLabel(st.label);
        setStateSub(st.sub || "");
        setStateStart(st.isStart);
        setStateAccept(st.isAccept);
        setStateTrap(st.isTrap);
        setStateX(Math.round(st.x));
        setStateY(Math.round(st.y));
      }
    } else if (selectedItem.type === "edge") {
      const ed = edges.find((e) => e.id === selectedItem.id);
      if (ed) {
        setEdgeFrom(ed.from);
        setEdgeTo(ed.to);
        setEdgeLabel(ed.label);
        setEdgeCurve(ed.curve || 0);
        setEdgeLabelPos(
          Math.round((ed.labelPos !== undefined ? ed.labelPos : 0.5) * 100)
        );
      }
    }
  }, [selectedItem, states, edges]);

  const handleSaveState = () => {
    if (!selectedItem || selectedItem.type !== "state") return;
    const st = states.find((s) => s.id === selectedItem.id);
    if (!st) return;
    onUpdateState({
      ...st,
      label: stateLabel.trim() || st.id,
      sub: stateSub.trim(),
      isStart: stateStart,
      isAccept: stateAccept,
      isTrap: stateTrap,
      x: Number(stateX) || st.x,
      y: Number(stateY) || st.y,
    });
  };

  const handleSaveEdge = () => {
    if (!selectedItem || selectedItem.type !== "edge") return;
    const ed = edges.find((e) => e.id === selectedItem.id);
    if (!ed) return;
    onUpdateEdge({
      ...ed,
      from: edgeFrom,
      to: edgeTo,
      label: edgeLabel.trim() || "ε",
      curve: Number(edgeCurve) || 0,
      labelPos: Number(edgeLabelPos) / 100,
    });
  };

  const handleCurveChange = (val: number) => {
    setEdgeCurve(val);
    if (selectedItem && selectedItem.type === "edge") {
      const ed = edges.find((e) => e.id === selectedItem.id);
      if (ed) {
        onUpdateEdge({ ...ed, curve: val });
      }
    }
  };

  const handleLabelPosChange = (val: number) => {
    setEdgeLabelPos(val);
    if (selectedItem && selectedItem.type === "edge") {
      const ed = edges.find((e) => e.id === selectedItem.id);
      if (ed) {
        onUpdateEdge({ ...ed, labelPos: val / 100 });
      }
    }
  };

  const handleQuickAdd = () => {
    if (!quickFrom || !quickTo) return;
    onQuickAddEdge(quickFrom, quickTo, quickLabel.trim() || "a");
    setQuickLabel("");
  };

  const getSubHeader = () => {
    if (!selectedItem) return "Click any node or edge";
    if (selectedItem.type === "state")
      return `Editing State ${stateLabel || selectedItem.id}`;
    return `Transition ${edgeFrom || "?"} → ${edgeTo || "?"}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col gap-2.5 transition-colors">
      {/* Collapsible Card Header */}
      <div
        onClick={() => setIsCollapsed((prev) => !prev)}
        className={`flex items-center justify-between ${
          isCollapsed
            ? ""
            : "border-b border-slate-200 dark:border-slate-800 pb-2"
        } cursor-pointer select-none transition-colors`}
      >
        <div className="flex items-center gap-1.5">
          <FiEdit3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            Inspector &amp; Quick Edit
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            {getSubHeader()}
          </span>
          <button
            type="button"
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer"
            title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
          >
            {isCollapsed ? (
              <FiChevronDown className="w-4 h-4" />
            ) : (
              <FiChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Body */}
      {!isCollapsed && (
        <div className="flex flex-col gap-3 text-xs pt-1">
          {/* 1. Empty View (No Selection) */}
          {!selectedItem && (
            <div className="flex flex-col gap-2.5 text-slate-700 dark:text-slate-300">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Select any{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  State Circle
                </strong>{" "}
                or{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  Transition Arrow
                </strong>{" "}
                on the canvas to rename labels, toggle accepting double-circles,
                or adjust curve angles.
              </p>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Quick Add Transition
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      From State
                    </label>
                    <select
                      value={quickFrom}
                      onChange={(e) =>
                        setQuickFrom((e.target as HTMLSelectElement).value)
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100"
                    >
                      {states.map((s) => (
                        <option key={`from-${s.id}`} value={s.id}>
                          {s.label} {s.sub ? `(${s.sub})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      To State
                    </label>
                    <select
                      value={quickTo}
                      onChange={(e) =>
                        setQuickTo((e.target as HTMLSelectElement).value)
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100"
                    >
                      {states.map((s) => (
                        <option key={`to-${s.id}`} value={s.id}>
                          {s.label} {s.sub ? `(${s.sub})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Input Symbol / Class
                  </label>
                  <input
                    type="text"
                    value={quickLabel}
                    onInput={(e) =>
                      setQuickLabel((e.target as HTMLInputElement).value)
                    }
                    placeholder="e.g. Digit or Letter, _"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FiPlus className="w-3.5 h-3.5" /> Add / Merge Transition
                </button>
              </div>

              <button
                type="button"
                onClick={onQuickAddState}
                className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <FiPlus className="w-3.5 h-3.5" /> Create New State on Canvas
              </button>
            </div>
          )}

          {/* 2. State Inspector Form */}
          {selectedItem && selectedItem.type === "state" && (
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  State Label (e.g. q0, d0)
                </label>
                <input
                  type="text"
                  value={stateLabel}
                  onInput={(e) =>
                    setStateLabel((e.target as HTMLInputElement).value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Description / Token Sub-label
                </label>
                <input
                  type="text"
                  value={stateSub}
                  onInput={(e) =>
                    setStateSub((e.target as HTMLInputElement).value)
                  }
                  placeholder="e.g. Accept Identifier"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={stateStart}
                    onChange={(e) =>
                      setStateStart((e.target as HTMLInputElement).checked)
                    }
                    className="rounded text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Start State</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={stateAccept}
                    onChange={(e) =>
                      setStateAccept((e.target as HTMLInputElement).checked)
                    }
                    className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Accepting</span>
                </label>
              </div>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={stateTrap}
                  onChange={(e) =>
                    setStateTrap((e.target as HTMLInputElement).checked)
                  }
                  className="rounded text-rose-500 focus:ring-0 cursor-pointer"
                />
                <span>Trap / Dead State Styling (φ)</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    X Position
                  </label>
                  <input
                    type="number"
                    value={stateX}
                    onInput={(e) =>
                      setStateX(Number((e.target as HTMLInputElement).value))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Y Position
                  </label>
                  <input
                    type="number"
                    value={stateY}
                    onInput={(e) =>
                      setStateY(Number((e.target as HTMLInputElement).value))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveState}
                  className="flex-1 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FiCheck className="w-3.5 h-3.5" /> Save State
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteState(selectedItem.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <FiTrash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          )}

          {/* 3. Edge Inspector Form */}
          {selectedItem && selectedItem.type === "edge" && (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    From State
                  </label>
                  <select
                    value={edgeFrom}
                    onChange={(e) =>
                      setEdgeFrom((e.target as HTMLSelectElement).value)
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100"
                  >
                    {states.map((s) => (
                      <option key={`ef-${s.id}`} value={s.id}>
                        {s.label} {s.sub ? `(${s.sub})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    To State
                  </label>
                  <select
                    value={edgeTo}
                    onChange={(e) =>
                      setEdgeTo((e.target as HTMLSelectElement).value)
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100"
                  >
                    {states.map((s) => (
                      <option key={`et-${s.id}`} value={s.id}>
                        {s.label} {s.sub ? `(${s.sub})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Transition Label (Symbols)
                </label>
                <input
                  type="text"
                  value={edgeLabel}
                  onInput={(e) =>
                    setEdgeLabel((e.target as HTMLInputElement).value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Arrow Curvedness / Stretch
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="-500"
                      max="500"
                      step="1"
                      value={edgeCurve}
                      onInput={(e) =>
                        handleCurveChange(
                          Number((e.target as HTMLInputElement).value) || 0
                        )
                      }
                      className="w-16 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-sky-600 dark:text-sky-400 font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-350"
                  max="350"
                  step="1"
                  value={edgeCurve}
                  onInput={(e) =>
                    handleCurveChange(
                      Number((e.target as HTMLInputElement).value)
                    )
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleCurveChange(-160)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer font-mono"
                  >
                    Deep ↶
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurveChange(-60)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer font-mono"
                  >
                    Left ↶
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurveChange(0)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer font-mono"
                  >
                    Straight
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurveChange(60)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer font-mono"
                  >
                    Right ↷
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurveChange(160)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer font-mono"
                  >
                    Deep ↷
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Label Position Along Arrow
                  </span>
                  <span className="mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {edgeLabelPos}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  value={edgeLabelPos}
                  onInput={(e) =>
                    handleLabelPosChange(
                      Number((e.target as HTMLInputElement).value)
                    )
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
                  <span>Near Source</span>
                  <span>Center (50%)</span>
                  <span>Near Target</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveEdge}
                  className="flex-1 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FiCheck className="w-3.5 h-3.5" /> Save Transition
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEdge(selectedItem.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <FiTrash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Persistent Quick Action Buttons when an item is selected */}
          {selectedItem && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={onQuickAddState}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                title="Create another state on canvas"
              >
                <FiPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />{" "}
                + State
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedItem.type === "state") {
                    setQuickFrom(selectedItem.id);
                  }
                  // Let user add transition from this state
                  const targetState =
                    states.find((s) => s.id !== selectedItem.id) || states[0];
                  if (targetState) {
                    onQuickAddEdge(selectedItem.id, targetState.id, "a");
                  }
                }}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                title="Quick add a transition from this state"
              >
                <FiPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />{" "}
                + Transition
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
