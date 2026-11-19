import React, { useEffect, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { generateSobelEdgeDataUrl } from '../utils/fundusGenerator';
import type { DetectedFeature, HeatmapRegion } from '../types/retina';

export type ViewerTab =
  | 'original'
  | 'attention'
  | 'heatmap'
  | 'features'
  | 'edges'
  | 'comparison';

export interface FocusTarget {
  x: number; // 0-100
  y: number; // 0-100
  zoom: number;
  label?: string;
}

interface ExplainabilityViewerProps {
  imageUrl: string;
  heatmapRegions: HeatmapRegion[];
  detectedFeatures: DetectedFeature[];
  focusTarget: FocusTarget | null;
  activeTab: ViewerTab;
  onTabChange: (tab: ViewerTab) => void;
  colormap?: 'thermal' | 'clinical';
  attributionNotice: string;
}

const VIEWER_TABS: { id: ViewerTab; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'attention', label: 'Attention Map' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'features', label: 'Feature Overlay' },
  { id: 'edges', label: 'Edge/Structure View' },
  { id: 'comparison', label: 'Comparison' },
];

export const ExplainabilityViewer: React.FC<ExplainabilityViewerProps> = ({
  imageUrl,
  heatmapRegions,
  detectedFeatures,
  focusTarget,
  activeTab,
  onTabChange,
  colormap = 'thermal',
  attributionNotice,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(72);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [sliderPos, setSliderPos] = useState(52);
  const [edgeUrl, setEdgeUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute Sobel edge/structure view when needed
  useEffect(() => {
    let cancelled = false;
    if (!imageUrl) return;
    generateSobelEdgeDataUrl(imageUrl).then((url) => {
      if (!cancelled) setEdgeUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Smoothly pan & zoom when an Evidence Trail or Feature target is selected
  useEffect(() => {
    if (!focusTarget) return;
    const z = Math.max(1.2, Math.min(3.5, focusTarget.zoom));
    // Shift image so (focusTarget.x%, focusTarget.y%) moves toward center (50%, 50%)
    const offsetX = (50 - focusTarget.x) * z * 3.6;
    const offsetY = (50 - focusTarget.y) * z * 3.6;
    setZoom(z);
    setPan({ x: offsetX, y: offsetY });
    if (activeTab === 'original') {
      onTabChange('heatmap');
    }
  }, [focusTarget]);

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab === 'comparison') return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: Math.max(-280, Math.min(280, dragStartRef.current.panX + dx)),
      y: Math.max(-280, Math.min(280, dragStartRef.current.panY + dy)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const renderOverlaySvg = (forceVisible = false) => {
    if ((!overlayEnabled && !forceVisible) || activeTab === 'original') return null;

    const showHeat = activeTab === 'heatmap' || activeTab === 'comparison';
    const showAttention = activeTab === 'attention';
    const showFeatures = activeTab === 'features';

    if (!showHeat && !showAttention && !showFeatures) return null;

    return (
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: opacity / 100 }}
        aria-hidden="true"
      >
        <defs>
          {heatmapRegions.map((reg, idx) => {
            const hotColor =
              colormap === 'clinical'
                ? reg.intensity > 0.75
                  ? '#f59e0b'
                  : '#06b6d4'
                : reg.intensity > 0.78
                  ? '#ef4444'
                  : reg.intensity > 0.55
                    ? '#f59e0b'
                    : '#06b6d4';

            const midColor =
              colormap === 'clinical' ? '#0891b2' : '#eab308';

            return (
              <radialGradient key={`grad-${idx}`} id={`heat-grad-${idx}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={hotColor} stopOpacity={Math.min(0.85, reg.intensity)} />
                <stop offset="52%" stopColor={midColor} stopOpacity={reg.intensity * 0.45} />
                <stop offset="100%" stopColor={midColor} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>

        {/* Heatmap Gaussian Saliency Blobs */}
        {showHeat &&
          heatmapRegions.map((reg, idx) => (
            <circle
              key={`hm-${idx}`}
              cx={reg.x}
              cy={reg.y}
              r={reg.radius}
              fill={`url(#heat-grad-${idx})`}
            />
          ))}

        {/* Attention Map Contours & Weight Grid */}
        {showAttention &&
          heatmapRegions.map((reg, idx) => (
            <g key={`att-${idx}`}>
              <circle
                cx={reg.x}
                cy={reg.y}
                r={reg.radius * 0.95}
                fill="rgba(6, 182, 212, 0.14)"
                stroke="#22d3ee"
                strokeWidth="0.45"
                strokeDasharray="1.5 1"
              />
              <circle
                cx={reg.x}
                cy={reg.y}
                r={reg.radius * 0.55}
                fill="rgba(139, 92, 246, 0.22)"
                stroke="#a78bfa"
                strokeWidth="0.5"
              />
              <text
                x={Math.min(82, reg.x + 2)}
                y={Math.max(8, reg.y - reg.radius * 0.6)}
                fill="#f8fafc"
                fontSize="2.7"
                fontFamily="JetBrains Mono, monospace"
              >
                {`${Math.round(reg.intensity * 100)}%`}
              </text>
            </g>
          ))}

        {/* Feature Overlay Bounding Markers */}
        {showFeatures &&
          detectedFeatures
            .filter((f) => f.detected)
            .map((feat) => {
              const stroke =
                feat.importance === 'High'
                  ? '#ef4444'
                  : feat.importance === 'Medium'
                    ? '#f59e0b'
                    : '#22d3ee';
              return (
                <g key={feat.id}>
                  <circle
                    cx={feat.coordinates.x}
                    cy={feat.coordinates.y}
                    r={feat.coordinates.radius * 0.62}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="0.65"
                  />
                  <line
                    x1={feat.coordinates.x - 2}
                    y1={feat.coordinates.y}
                    x2={feat.coordinates.x + 2}
                    y2={feat.coordinates.y}
                    stroke={stroke}
                    strokeWidth="0.45"
                  />
                  <line
                    x1={feat.coordinates.x}
                    y1={feat.coordinates.y - 2}
                    x2={feat.coordinates.x}
                    y2={feat.coordinates.y + 2}
                    stroke={stroke}
                    strokeWidth="0.45"
                  />
                  <rect
                    x={Math.max(2, Math.min(68, feat.coordinates.x - 10))}
                    y={Math.max(3, feat.coordinates.y - feat.coordinates.radius * 0.62 - 4.5)}
                    width="24"
                    height="3.8"
                    rx="0.8"
                    fill="rgba(7, 11, 20, 0.84)"
                    stroke={stroke}
                    strokeWidth="0.25"
                  />
                  <text
                    x={Math.max(3, Math.min(69, feat.coordinates.x - 9))}
                    y={Math.max(5.8, feat.coordinates.y - feat.coordinates.radius * 0.62 - 1.8)}
                    fill="#f8fafc"
                    fontSize="2.2"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {feat.name}
                  </text>
                </g>
              );
            })}

        {/* Active Evidence Focus Crosshair */}
        {focusTarget && (
          <g>
            <circle
              cx={focusTarget.x}
              cy={focusTarget.y}
              r="7.5"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.7"
              strokeDasharray="1.6 1.2"
            />
            <circle cx={focusTarget.x} cy={focusTarget.y} r="1.2" fill="#22d3ee" />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] overflow-hidden">
      {/* Mode Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#090E1A]"
          role="tablist"
          aria-label="Explainability Image View Modes"
        >
          {VIEWER_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Zoom / Pan / Reset Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.35).toFixed(2))))}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 w-12 text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.8, Number((z + 0.35).toFixed(2))))}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Reset zoom and pan"
            title="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Viewport Stage */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative bg-[#04060B] aspect-square max-h-[520px] w-full overflow-hidden select-none ${
          activeTab === 'comparison'
            ? 'cursor-ew-resize'
            : zoom > 1
              ? isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-crosshair'
        }`}
      >
        {activeTab === 'comparison' ? (
          /* Interactive Draggable Before/After Comparison View */
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full max-w-[520px] max-h-[520px] mx-auto">
              <img
                src={imageUrl}
                alt="Original retinal fundus image"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />

              {/* Right clipped AI explanation layer */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              >
                <img
                  src={imageUrl}
                  alt="AI explanation overlay on retinal fundus"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
                {renderOverlaySvg(true)}
              </div>

              {/* Divider handle */}
              <div
                className="absolute inset-y-0 w-0.5 bg-cyan-400 pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                aria-label="Comparison slider between original image and AI explanation overlay"
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
              />

              <div className="pointer-events-none absolute top-3 left-3 text-[11px] font-mono text-white bg-slate-950/75 px-2 py-1 rounded">
                Original
              </div>
              <div className="pointer-events-none absolute top-3 right-3 text-[11px] font-mono text-cyan-300 bg-slate-950/75 px-2 py-1 rounded">
                AI Explanation
              </div>
            </div>
          </div>
        ) : (
          /* Zoomable & Pannable Single-Layer Canvas */
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="relative w-full h-full max-w-[520px] max-h-[520px] transition-transform duration-200 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={activeTab === 'edges' && edgeUrl ? edgeUrl : imageUrl}
                alt={
                  activeTab === 'edges'
                    ? 'Sobel green-channel vessel and edge structure view'
                    : 'Retinal fundus image'
                }
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-full object-contain"
              />
              {renderOverlaySvg(false)}
            </div>
          </div>
        )}

        {focusTarget?.label && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-slate-950/85 border border-cyan-500/40 px-2.5 py-1 text-[11px] font-mono text-cyan-200">
            Focused: {focusTarget.label}
          </div>
        )}
      </div>

      {/* Overlay Controls + Opacity + Notice */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-3 bg-slate-50/70 dark:bg-[#090E1A]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOverlayEnabled((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors whitespace-nowrap"
            >
              {overlayEnabled ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Overlay On</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Overlay Off</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <label
                htmlFor="overlay-opacity"
                className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
              >
                Opacity
              </label>
              <input
                id="overlay-opacity"
                type="range"
                min={10}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-24 sm:w-32 accent-cyan-600"
              />
              <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 w-9">
                {opacity}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>Low Saliency</span>
            <span
              className={`w-20 h-2 rounded-full ${
                colormap === 'clinical'
                  ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                  : 'bg-gradient-to-r from-cyan-500 via-amber-400 to-red-500'
              }`}
              aria-hidden="true"
            />
            <span>High Attribution</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{attributionNotice}</span>
        </div>
      </div>
    </div>
  );
};
