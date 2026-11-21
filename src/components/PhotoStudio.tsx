import React, { useEffect, useRef, useState } from 'react';
import {
  Contrast,
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  ZoomIn,
} from 'lucide-react';
import { PhotoSettings } from '../types/cv';
import {
  getPhotoAspectDimensions,
  readHighResImageFile,
  renderHighDpiCroppedPhoto,
} from '../utils/imageAndPdf';
import { ToggleCheck } from './ToggleSwitch';

interface PhotoStudioProps {
  photo: PhotoSettings;
  onChange: (next: PhotoSettings) => void;
  onNotify?: (msg: string) => void;
}

export const PhotoStudio: React.FC<PhotoStudioProps> = ({
  photo,
  onChange,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [croppedPreview, setCroppedPreview] = useState<string>(photo.dataUrl);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );

  const dims = getPhotoAspectDimensions(photo.aspect);

  useEffect(() => {
    let cancelled = false;
    if (!photo.dataUrl) {
      setCroppedPreview('');
      return;
    }
    renderHighDpiCroppedPhoto(photo).then((url) => {
      if (!cancelled) setCroppedPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [
    photo.dataUrl,
    photo.zoom,
    photo.panX,
    photo.panY,
    photo.brightness,
    photo.contrast,
    photo.aspect,
  ]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, width, height } = await readHighResImageFile(file, 3840);
      onChange({
        ...photo,
        enabled: true,
        dataUrl,
        zoom: 1,
        panX: 0,
        panY: 0,
        brightness: 100,
        contrast: 100,
      });
      onNotify?.(`High-res photo loaded (${width}×${height}px)`);
    } catch {
      onNotify?.('Unable to load image. Please choose a valid PNG, JPG, or WEBP file.');
    } finally {
      e.target.value = '';
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!photo.dataUrl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: photo.panX,
      panY: photo.panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextPanX = Math.max(-50, Math.min(50, dragStartRef.current.panX + dx * 0.45));
    const nextPanY = Math.max(-50, Math.min(50, dragStartRef.current.panY + dy * 0.45));
    onChange({
      ...photo,
      panX: Math.round(nextPanX * 10) / 10,
      panY: Math.round(nextPanY * 10) / 10,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <ToggleCheck
          checked={photo.enabled}
          onChange={(enabled) => onChange({ ...photo, enabled })}
          label="Show High-DPI Profile Photo on CV"
        />
        <span className="text-[11px] font-mono-tabular text-slate-400">
          {dims.exportWidthPx}×{dims.exportHeightPx}px Print Frame
        </span>
      </div>

      {photo.enabled && (
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3.5 pt-1 items-start">
          {/* Interactive Pan/Zoom Framing Viewport */}
          <div className="flex flex-col items-center gap-2">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                width: '108px',
                height: `${Math.round(108 / dims.ratio)}px`,
              }}
              className={`relative overflow-hidden rounded border border-slate-300 bg-slate-100 select-none ${
                photo.dataUrl ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              title={photo.dataUrl ? 'Drag to pan photo framing' : 'No photo uploaded'}
            >
              {photo.dataUrl ? (
                <img
                  src={croppedPreview || photo.dataUrl}
                  alt="Passport Portrait Framing Preview"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="high-quality-img w-full h-full object-cover block"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 px-2 text-center">
                  <Upload className="w-4 h-4 mb-1" />
                  <span className="text-[10px] leading-tight">Upload 35×45mm Photo</span>
                </div>
              )}
            </div>
            {photo.dataUrl && (
              <span className="text-[10px] text-slate-500 text-center">
                Drag frame or slide Pan X/Y
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-2.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                {photo.dataUrl ? 'Replace Photo' : 'Upload High-Res Photo'}
              </button>

              {photo.dataUrl && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...photo,
                        zoom: 1,
                        panX: 0,
                        panY: 0,
                        brightness: 100,
                        contrast: 100,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                    title="Reset photo adjustments"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...photo, dataUrl: '', enabled: false })}
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors whitespace-nowrap"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </>
              )}
            </div>

            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-600 w-16 shrink-0">
                Frame
              </span>
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200">
                {(
                  [
                    { id: '35x45', label: '35×45mm' },
                    { id: '1x1', label: '1:1 Square' },
                    { id: '4x5', label: '4:5 Portrait' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...photo, aspect: opt.id })}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                      photo.aspect === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 w-20 shrink-0">
                  <ZoomIn className="w-3 h-3" /> Zoom
                </span>
                <input
                  type="range"
                  min={1}
                  max={2.6}
                  step={0.05}
                  value={photo.zoom}
                  onChange={(e) =>
                    onChange({ ...photo, zoom: parseFloat(e.target.value) })
                  }
                  className="w-full accent-slate-900 h-1.5"
                />
                <span className="text-[11px] font-mono-tabular text-slate-500 w-10 text-right">
                  {photo.zoom.toFixed(2)}×
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 w-20 shrink-0">
                  <MoveHorizontal className="w-3 h-3" /> Pan X
                </span>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  step={1}
                  value={photo.panX}
                  onChange={(e) =>
                    onChange({ ...photo, panX: parseFloat(e.target.value) })
                  }
                  className="w-full accent-slate-900 h-1.5"
                />
                <span className="text-[11px] font-mono-tabular text-slate-500 w-10 text-right">
                  {Math.round(photo.panX)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 w-20 shrink-0">
                  <MoveVertical className="w-3 h-3" /> Pan Y
                </span>
                <input
                  type="range"
                  min={-40}
                  max={40}
                  step={1}
                  value={photo.panY}
                  onChange={(e) =>
                    onChange({ ...photo, panY: parseFloat(e.target.value) })
                  }
                  className="w-full accent-slate-900 h-1.5"
                />
                <span className="text-[11px] font-mono-tabular text-slate-500 w-10 text-right">
                  {Math.round(photo.panY)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 w-20 shrink-0">
                  <Sun className="w-3 h-3" /> Bright
                </span>
                <input
                  type="range"
                  min={75}
                  max={130}
                  step={1}
                  value={photo.brightness}
                  onChange={(e) =>
                    onChange({ ...photo, brightness: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-slate-900 h-1.5"
                />
                <span className="text-[11px] font-mono-tabular text-slate-500 w-10 text-right">
                  {photo.brightness}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 w-20 shrink-0">
                  <Contrast className="w-3 h-3" /> Contrast
                </span>
                <input
                  type="range"
                  min={75}
                  max={130}
                  step={1}
                  value={photo.contrast}
                  onChange={(e) =>
                    onChange({ ...photo, contrast: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-slate-900 h-1.5"
                />
                <span className="text-[11px] font-mono-tabular text-slate-500 w-10 text-right">
                  {photo.contrast}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
