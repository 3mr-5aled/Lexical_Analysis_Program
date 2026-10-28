import { useEffect, useState, useMemo } from "preact/hooks";
import {
  getCleanSvgMarkup,
  generateJflapXml,
  downloadBlob,
} from "../core/export-service";
import { config } from "../config/export.config";
import {
  FiDownload,
  FiCheck,
  FiX,
  FiLayers,
  FiImage,
  FiFileText,
} from "react-icons/fi";

export interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: "svg" | "png" | "jflap";
  presetName: string;
  isDark?: boolean;
  graphModel?: any;
}

export function ExportPreviewModal({
  isOpen,
  onClose,
  exportType,
  presetName,
  isDark = false,
  graphModel,
}: ExportPreviewModalProps) {
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Compute clean SVG markup and bounds
  const svgResult = useMemo(() => {
    if (!isOpen) return null;
    return getCleanSvgMarkup({ isDark, graphModel });
  }, [isOpen, isDark, graphModel]);

  // Compute JFLAP XML if type is jflap
  const jflapXml = useMemo(() => {
    if (!isOpen || exportType !== "jflap") return "";
    return generateJflapXml(presetName, graphModel);
  }, [isOpen, exportType, presetName, graphModel]);

  // Generate PNG preview via offscreen canvas if type is png
  useEffect(() => {
    if (!isOpen || exportType !== "png" || !svgResult) {
      setPngDataUrl(null);
      return;
    }

    setIsRendering(true);
    const { markup, width, height } = svgResult;
    const img = new Image();
    const dataUri =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = Math.max(width, height);
        const scale = Math.min(3, Math.max(2.0, 2600 / maxDim));
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          setPngDataUrl(dataUrl);
        }
      } catch (e) {
        console.error("Failed to generate preview PNG", e);
      } finally {
        setIsRendering(false);
      }
    };

    img.onerror = () => {
      setIsRendering(false);
    };

    img.src = dataUri;
  }, [isOpen, exportType, svgResult]);

  if (!isOpen) return null;

  const safeName = (presetName || "diagram").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename =
    exportType === "svg"
      ? `automata_${safeName}.svg`
      : exportType === "png"
        ? `automata_${safeName}.png`
        : `automata_${safeName}.jff`;

  const handleDownload = () => {
    if (exportType === "svg" && svgResult) {
      downloadBlob(svgResult.markup, filename, "image/svg+xml;charset=utf-8");
    } else if (exportType === "png" && pngDataUrl) {
      const binStr = atob(pngDataUrl.split(",")[1]);
      const u8Arr = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        u8Arr[i] = binStr.charCodeAt(i);
      }
      const blob = new Blob([u8Arr], { type: "image/png" });
      downloadBlob(blob, filename, "image/png");
    } else if (exportType === "jflap" && jflapXml) {
      downloadBlob(jflapXml, filename, "application/xml");
    }

    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      onClose();
    }, 1200);
  };

  const formatTitle =
    exportType === "svg"
      ? "Vector SVG Diagram"
      : exportType === "png"
        ? "High-Resolution PNG Image"
        : "JFLAP Diagram (.JFF)";

  const formatIcon =
    exportType === "svg" ? (
      <FiLayers className="w-4 h-4 text-sky-500" />
    ) : exportType === "png" ? (
      <FiImage className="w-4 h-4 text-emerald-500" />
    ) : (
      <FiFileText className="w-4 h-4 text-amber-500" />
    );

  const previewWidth = svgResult ? Math.round(svgResult.width) : 920;
  const previewHeight = svgResult ? Math.round(svgResult.height) : 460;
  const pngWidth =
    previewWidth *
    (exportType === "png"
      ? Math.min(3, Math.max(2.0, 2600 / Math.max(previewWidth, previewHeight)))
      : 1);
  const pngHeight =
    previewHeight *
    (exportType === "png"
      ? Math.min(3, Math.max(2.0, 2600 / Math.max(previewWidth, previewHeight)))
      : 1);

  return (
    <div
      id="exportPreviewModal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden transition-all animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              {formatIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Export Preview
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-mono">
                  {exportType}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[280px] sm:max-w-md">
                {formatTitle} • {presetName}
              </p>
            </div>
          </div>

          <button
            id="btnCloseExportPreview"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer transition"
            aria-label="Close Preview"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata Bar */}
        <div className="px-5 py-2 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs font-semibold">
              📁 {filename}
            </span>
            <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              📐 Dimensions:{" "}
              <strong className="text-slate-800 dark:text-slate-100 font-mono">
                {exportType === "png"
                  ? `${Math.round(pngWidth)} × ${Math.round(pngHeight)} px (High-DPI)`
                  : `${previewWidth} × ${previewHeight} px`}
              </strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded border shadow-2xs font-medium flex items-center gap-1 ${
                config.watermark
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${config.watermark ? "bg-emerald-500" : "bg-slate-400"}`}
              ></span>
              Watermark:{" "}
              {config.watermark
                ? "Active [Logo + Automata Studio]"
                : "Disabled"}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 italic hidden sm:block">
            Auto-fit bounding box • 60px padding
          </div>
        </div>

        {/* Interactive Preview Canvas / Code Box */}
        <div className="flex-1 p-4 overflow-auto bg-slate-900/10 dark:bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[55vh]">
          {exportType === "svg" && svgResult && (
            <div
              id="previewSvgContainer"
              className="w-full max-h-[50vh] flex items-center justify-center overflow-auto rounded-xl shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2"
              dangerouslySetInnerHTML={{ __html: svgResult.markup }}
            />
          )}

          {exportType === "png" && (
            <div
              id="previewPngContainer"
              className="flex flex-col items-center justify-center w-full max-h-[50vh] overflow-auto"
            >
              {isRendering ? (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-500 dark:text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Rendering high-resolution raster canvas...</span>
                </div>
              ) : pngDataUrl ? (
                <img
                  src={pngDataUrl}
                  alt="Automata PNG Export Preview"
                  className="max-w-full max-h-[48vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="text-rose-500 text-xs font-semibold">
                  Failed to render PNG preview
                </div>
              )}
            </div>
          )}

          {exportType === "jflap" && (
            <div className="w-full h-full max-h-[50vh] overflow-auto rounded-xl bg-slate-950 border border-slate-800 p-4 shadow-inner">
              <pre className="text-xs font-mono text-amber-300 leading-relaxed select-text whitespace-pre-wrap">
                {jflapXml}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {exportType === "png"
              ? "2x–3x scaled rendering with zero compression artifacts."
              : exportType === "svg"
                ? "Resolution-independent vector graphics with embedded fonts."
                : "Standard JFLAP 7.x finite automaton XML file."}
          </span>

          <div className="flex items-center gap-2">
            <button
              id="btnCancelExportPreview"
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btnConfirmDownload"
              type="button"
              onClick={handleDownload}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                downloaded
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-sky-600 hover:bg-sky-500 text-white"
              }`}
            >
              {downloaded ? (
                <>
                  <FiCheck className="w-3.5 h-3.5" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>Download {exportType.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
