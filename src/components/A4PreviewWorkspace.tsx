import React, { useEffect, useRef, useState } from 'react';
import { MARGIN_CONFIGS, THEME_CONFIGS } from '../data/presets';
import {
  CVDocumentState,
  CVFontStyle,
  MarginPreset,
  ThemePreset,
} from '../types/cv';
import { CVSheetRenderer } from './CVSheetRenderer';

interface A4PreviewWorkspaceProps {
  cv: CVDocumentState;
  onChange: (updater: (prev: CVDocumentState) => CVDocumentState) => void;
  sheetRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

type ZoomMode = 'fit' | number;

export const A4PreviewWorkspace: React.FC<A4PreviewWorkspaceProps> = ({
  cv,
  onChange,
  sheetRefs,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [autoScale, setAutoScale] = useState(0.76);
  const [pageCounts, setPageCounts] = useState({ cv: 1, att: 0 });

  // Measure container width so "Fit" scales 210mm (~794px) cleanly
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const updateScale = () => {
      const avail = el.clientWidth - 48; // 24px horizontal breathing room each side
      const a4WidthPx = 793.7;
      const next = Math.max(0.4, Math.min(1.05, avail / a4WidthPx));
      setAutoScale(Math.round(next * 100) / 100);
    };
    updateScale();
    const obs = new ResizeObserver(updateScale);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const activeScale = zoomMode === 'fit' ? autoScale : zoomMode;
  const totalPages = pageCounts.cv + pageCounts.att;

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-200/80 print-only-container">
      {/* Preview Typography & Sheet Toolbar */}
      <div className="no-print bg-white border-b border-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Theme Preset */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">Theme</span>
            <select
              value={cv.theme}
              onChange={(e) =>
                onChange((p) => ({ ...p, theme: e.target.value as ThemePreset }))
              }
              aria-label="CV Color Theme"
              className="px-2 py-1 text-xs font-medium border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            >
              {Object.values(THEME_CONFIGS).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Margin Preset */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">Margins</span>
            <select
              value={cv.margin}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  margin: e.target.value as MarginPreset,
                }))
              }
              aria-label="A4 Print Margins"
              className="px-2 py-1 text-xs font-medium border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            >
              {Object.values(MARGIN_CONFIGS).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Style */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200">
            {(
              [
                { id: 'sans', label: 'Sans' },
                { id: 'serif', label: 'Serif' },
              ] as { id: CVFontStyle; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange((p) => ({ ...p, fontStyle: f.id }))}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  cv.fontStyle === f.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Font Scale Slider */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">Scale</span>
            <input
              type="range"
              min={90}
              max={110}
              step={1}
              value={cv.fontScale}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  fontScale: parseInt(e.target.value, 10),
                }))
              }
              aria-label="CV Font Scale"
              className="w-20 accent-slate-900 h-1.5"
            />
            <span className="text-[11px] font-mono-tabular text-slate-700 w-9">
              {cv.fontScale}%
            </span>
          </div>
        </div>

        {/* Zoom & Page Count */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200">
            {(
              [
                { id: 'fit', label: 'Fit' },
                { id: 0.65, label: '65%' },
                { id: 0.85, label: '85%' },
                { id: 1, label: '100%' },
              ] as { id: ZoomMode; label: string }[]
            ).map((z) => (
              <button
                key={String(z.id)}
                type="button"
                onClick={() => setZoomMode(z.id)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  zoomMode === z.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono-tabular text-slate-600 whitespace-nowrap">
            {pageCounts.cv} CV{pageCounts.att > 0 ? ` + ${pageCounts.att} Att.` : ''} ·{' '}
            {totalPages} A4 {totalPages === 1 ? 'Sheet' : 'Sheets'}
          </span>
        </div>
      </div>

      {/* Scrollable A4 Sheet Stage */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-auto studio-scroll p-6 print-scale-reset"
      >
        <div
          className="mx-auto flex flex-col items-center gap-6 print-scale-reset"
          style={{
            transform: `scale(${activeScale})`,
            transformOrigin: 'top center',
            width: '210mm',
            // Compensate vertical height after CSS transform so scroll container stays clean
            marginBottom:
              activeScale < 1
                ? `-${Math.round((1 - activeScale) * totalPages * 1122)}px`
                : '24px',
          }}
        >
          <CVSheetRenderer
            cv={cv}
            sheetRefs={sheetRefs}
            onPageCountChange={(cvP, attP) =>
              setPageCounts((prev) =>
                prev.cv === cvP && prev.att === attP
                  ? prev
                  : { cv: cvP, att: attP }
              )
            }
          />
        </div>
      </div>
    </div>
  );
};
