import React, { useEffect, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Info,
  Download,
  LayoutGrid,
} from 'lucide-react';
import { generateSobelEdgeDataUrl } from '../utils/fundusGenerator';
import type { DetectedFeature, HeatmapRegion } from '../types/retina';

export type ViewerTab =
  | 'grid'
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
  pixelGrid?: number[][];
  explainabilityMethod?: string;
  detectedFeatures: DetectedFeature[];
  focusTarget: FocusTarget | null;
  activeTab: ViewerTab;
  onTabChange: (tab: ViewerTab) => void;
  colormap?: 'thermal' | 'clinical';
  attributionNotice: string;
  caseId?: string;
  predictionLabel?: string;
}

const VIEWER_TABS: { id: ViewerTab; label: string }[] = [
  { id: 'grid', label: '4-Panel Grid' },
  { id: 'heatmap', label: 'Retina Map (Heatmap)' },
  { id: 'attention', label: 'Attention Map' },
  { id: 'features', label: 'Feature Overlay' },
  { id: 'edges', label: 'Edge/Structure' },
  { id: 'comparison', label: 'Before/After' },
  { id: 'original', label: 'Original' },
];

export const ExplainabilityViewer: React.FC<ExplainabilityViewerProps> = ({
  imageUrl,
  heatmapRegions,
  pixelGrid,
  explainabilityMethod,
  detectedFeatures,
  focusTarget,
  activeTab,
  onTabChange,
  colormap = 'thermal',
  attributionNotice,
  caseId,
  predictionLabel,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(72);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [sliderPos, setSliderPos] = useState(52);
  const [edgeUrl, setEdgeUrl] = useState<string | null>(null);
  const [pixelHeatmapUrl, setPixelHeatmapUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Render smooth continuous pixel saliency map when 24x24 computed pixelGrid is provided
  useEffect(() => {
    if (!pixelGrid || pixelGrid.length === 0) {
      setPixelHeatmapUrl(null);
      return;
    }
    const dim = pixelGrid.length;
    const small = document.createElement('canvas');
    small.width = dim;
    small.height = dim;
    const sCtx = small.getContext('2d');
    if (!sCtx) return;

    const imgData = sCtx.createImageData(dim, dim);
    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const v = Math.max(0, Math.min(1, pixelGrid[y]?.[x] ?? 0));
        const idx = (y * dim + x) * 4;
        if (v < 0.12) {
          imgData.data[idx + 3] = 0;
          continue;
        }
        if (colormap === 'clinical') {
          // Cyan -> Amber
          imgData.data[idx] = Math.round(6 + v * 239);
          imgData.data[idx + 1] = Math.round(182 - v * 24);
          imgData.data[idx + 2] = Math.round(212 * (1 - v));
        } else {
          // Thermal: Cyan -> Amber -> Red
          if (v < 0.55) {
            const t = v / 0.55;
            imgData.data[idx] = Math.round(6 + t * 239);
            imgData.data[idx + 1] = Math.round(182 - t * 24);
            imgData.data[idx + 2] = Math.round(212 * (1 - t));
          } else {
            const t = (v - 0.55) / 0.45;
            imgData.data[idx] = 239;
            imgData.data[idx + 1] = Math.round(158 * (1 - t));
            imgData.data[idx + 2] = Math.round(11 + t * 50);
          }
        }
        imgData.data[idx + 3] = Math.round(Math.min(235, v * 255));
      }
    }
    sCtx.putImageData(imgData, 0, 0);

    const out = document.createElement('canvas');
    out.width = 256;
    out.height = 256;
    const oCtx = out.getContext('2d');
    if (!oCtx) return;
    oCtx.imageSmoothingEnabled = true;
    oCtx.imageSmoothingQuality = 'high';
    oCtx.filter = 'blur(8px)';
    oCtx.drawImage(small, 0, 0, 256, 256);
    setPixelHeatmapUrl(out.toDataURL('image/png'));
  }, [pixelGrid, colormap]);

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

  const handleDownloadExplanationPng = async () => {
    try {
      const size = 640;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size + 56;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#070B14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const loadImg = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = src;
        });

      const baseImg = await loadImg(imageUrl);
      ctx.drawImage(baseImg, 0, 0, size, size);

      if (overlayEnabled && pixelHeatmapUrl) {
        const heatImg = await loadImg(pixelHeatmapUrl);
        ctx.save();
        ctx.globalAlpha = opacity / 100;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(heatImg, 0, 0, size, size);
        ctx.restore();
      } else if (overlayEnabled) {
        for (const reg of heatmapRegions) {
          const cx = (reg.x / 100) * size;
          const cy = (reg.y / 100) * size;
          const rad = (reg.radius / 100) * size;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
          grad.addColorStop(0, `rgba(239, 68, 68, ${Math.min(0.85, reg.intensity * (opacity / 100))})`);
          grad.addColorStop(0.55, `rgba(245, 158, 11, ${reg.intensity * 0.45 * (opacity / 100)})`);
          grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = '#0D1322';
      ctx.fillRect(0, size, size, 56);
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(
        `IRIDEON XAI EXPLANATION · ${caseId ?? 'CASE'} · ${predictionLabel ?? 'PROTOTYPE'}`,
        16,
        size + 22
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText(
        'Model Attention Visualization — Research & Educational Use Only (Not a Clinical Diagnosis)',
        16,
        size + 42
      );

      const link = document.createElement('a');
      link.download = `IRIDEON-Explanation-${caseId ?? 'case'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // ignore canvas export errors silently
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab === 'comparison' || activeTab === 'grid') return;
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
      <>
        {showHeat && pixelHeatmapUrl && (
          <img
            src={pixelHeatmapUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen"
            style={{ opacity: opacity / 100 }}
          />
        )}
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

          {/* Heatmap Gaussian Saliency Blobs (used when pixel grid isn't available or as soft region highlights) */}
          {showHeat && !pixelHeatmapUrl &&
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
      </>
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

        {/* Zoom / Pan / Reset / Export Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleDownloadExplanationPng}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors whitespace-nowrap mr-1"
            title="Download composited explanation PNG"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Download PNG</span>
          </button>

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
        className={`relative bg-[#04060B] w-full overflow-hidden select-none ${
          activeTab === 'grid'
            ? 'p-3 sm:p-4'
            : activeTab === 'comparison'
              ? 'aspect-square max-h-[520px] cursor-ew-resize'
              : zoom > 1
                ? isDragging
                  ? 'aspect-square max-h-[520px] cursor-grabbing'
                  : 'aspect-square max-h-[520px] cursor-grab'
                : 'aspect-square max-h-[520px] cursor-crosshair'
        }`}
      >
        {activeTab === 'grid' ? (
          /* 4-Panel Simultaneous Research Inspection Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Panel 1: Original */}
            <div className="rounded-lg border border-slate-800 bg-[#070B14] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span>1. Original Retinal Image</span>
                <span className="text-slate-500">Input ROI</span>
              </div>
              <div className="relative aspect-square max-h-[240px] mx-auto flex items-center justify-center bg-black">
                <img
                  src={imageUrl}
                  alt="Original retinal image"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Panel 2: Attention / Saliency Heatmap */}
            <div className="rounded-lg border border-slate-800 bg-[#070B14] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-cyan-300">
                <span>2. Attention Heatmap</span>
                <span className="text-slate-400">Model Attention</span>
              </div>
              <div className="relative aspect-square max-h-[240px] mx-auto flex items-center justify-center bg-black">
                <img
                  src={imageUrl}
                  alt="Model attention heatmap background"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain opacity-35"
                />
                {pixelHeatmapUrl ? (
                  <img
                    src={pixelHeatmapUrl}
                    alt="Computed pixel saliency heatmap"
                    className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
                    style={{ opacity: Math.min(1, opacity / 90) }}
                  />
                ) : (
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      {heatmapRegions.map((reg, idx) => (
                        <radialGradient key={`g2-def-${idx}`} id={`g2-grad-${idx}`} cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={reg.intensity > 0.7 ? '#ef4444' : '#f59e0b'} stopOpacity={reg.intensity * 0.85} />
                          <stop offset="60%" stopColor="#06b6d4" stopOpacity={reg.intensity * 0.35} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                        </radialGradient>
                      ))}
                    </defs>
                    {heatmapRegions.map((reg, idx) => (
                      <circle
                        key={`g-hm-${idx}`}
                        cx={reg.x}
                        cy={reg.y}
                        r={reg.radius}
                        fill={`url(#g2-grad-${idx})`}
                      />
                    ))}
                  </svg>
                )}
              </div>
            </div>

            {/* Panel 3: Structural & Vessel Edge Contrast */}
            <div className="rounded-lg border border-slate-800 bg-[#070B14] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-emerald-300">
                <span>3. Vessel & Edge Contrast</span>
                <span className="text-slate-400">Sobel Green</span>
              </div>
              <div className="relative aspect-square max-h-[240px] mx-auto flex items-center justify-center bg-black">
                <img
                  src={edgeUrl || imageUrl}
                  alt="Green-channel Sobel structural vessel contrast map"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Panel 4: Combined Explanation Overlay */}
            <div className="rounded-lg border border-slate-800 bg-[#070B14] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-amber-300">
                <span>4. Combined Explanation</span>
                <span className="inline-flex items-center gap-1 text-cyan-400">
                  <LayoutGrid className="w-3 h-3" />
                  <span>Overlay</span>
                </span>
              </div>
              <div className="relative aspect-square max-h-[240px] mx-auto flex items-center justify-center bg-black">
                <img
                  src={imageUrl}
                  alt="Combined retinal explanation overlay"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
                {overlayEnabled && pixelHeatmapUrl && (
                  <img
                    src={pixelHeatmapUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen"
                    style={{ opacity: opacity / 100 }}
                  />
                )}
                {overlayEnabled && (
                  <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ opacity: opacity / 100 }}
                  >
                    <defs>
                      {heatmapRegions.map((reg, idx) => (
                        <radialGradient key={`g4-def-${idx}`} id={`g4-grad-${idx}`} cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={reg.intensity > 0.7 ? '#ef4444' : '#f59e0b'} stopOpacity={reg.intensity * 0.85} />
                          <stop offset="60%" stopColor="#06b6d4" stopOpacity={reg.intensity * 0.35} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                        </radialGradient>
                      ))}
                    </defs>
                    {heatmapRegions.map((reg, idx) => (
                      <g key={`comb-${idx}`}>
                        {!pixelHeatmapUrl && (
                          <circle cx={reg.x} cy={reg.y} r={reg.radius} fill={`url(#g4-grad-${idx})`} />
                        )}
                        <circle
                          cx={reg.x}
                          cy={reg.y}
                          r={reg.radius * 0.65}
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="0.6"
                          strokeDasharray="1.5 1"
                        />
                      </g>
                    ))}
                  </svg>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'comparison' ? (
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

        <div className="space-y-1 text-xs">
          <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {attributionNotice ||
                "The highlighted regions indicate areas that influenced the model's prediction. This visualization is an AI explanation aid and is not clinical proof."}
            </span>
          </div>
          {explainabilityMethod && (
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pl-5">
              Method: {pixelHeatmapUrl ? 'Computed 24×24 Pixel Saliency Map (Green-Channel & Contrast)' : explainabilityMethod}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
