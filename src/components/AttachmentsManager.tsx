import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { AttachmentItem } from '../types/cv';
import {
  parseImageFileToAttachment,
  parsePdfFileToAttachments,
} from '../utils/imageAndPdf';
import { ToggleCheck } from './ToggleSwitch';

interface AttachmentsManagerProps {
  attachments: AttachmentItem[];
  onChange: (next: AttachmentItem[]) => void;
  onNotify?: (msg: string) => void;
}

export const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({
  attachments,
  onChange,
  onNotify,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    try {
      const added: AttachmentItem[] = [];
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const pages = await parsePdfFileToAttachments(file);
          added.push(...pages);
        } else if (file.type.startsWith('image/')) {
          const item = await parseImageFileToAttachment(file);
          added.push(item);
        }
      }
      if (added.length > 0) {
        onChange([...attachments, ...added]);
        onNotify?.(
          `Added ${added.length} attachment sheet${added.length > 1 ? 's' : ''} to binder`
        );
      } else {
        onNotify?.('No supported PDF or image files were found.');
      }
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Failed to parse attachment file.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= attachments.length) return;
    const copy = [...attachments];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChange(copy);
  };

  const updateItem = (id: string, patch: Partial<AttachmentItem>) => {
    onChange(attachments.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeItem = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-display font-semibold text-slate-900">
              Supporting Evidence & PDF Binder
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Attach Academic Certificates, Marksheets, NID Card (Front/Back), Typing
              Certificates, or multi-page PDFs. Checked items automatically append as
              crisp A4 sheets after your CV.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-slate-500 shrink-0">
            {attachments.filter((a) => a.enabled).length}/{attachments.length} active
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !isProcessing && inputRef.current?.click()}
          className={`rounded-md border border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
            isDraggingOver
              ? 'border-slate-900 bg-slate-100'
              : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-400'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 text-slate-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">
                Rendering high-resolution pages via PDF.js...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="inline-flex items-center gap-2 text-slate-700">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  Click or Drop PDF, JPG, PNG, or WEBP Files
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Multi-page PDFs automatically split into individual high-DPI A4 pages
              </span>
            </div>
          )}
        </div>
      </div>

      {attachments.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center">
          <ImagePlus className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700">
            No supporting documents attached yet
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Upload your NID front/back, SSC/HSC/Degree certificates, or PDF transcripts
            to bundle them with your CV download.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {attachments.map((item, idx) => (
            <div
              key={item.id}
              className={`rounded-lg border p-3 transition-colors ${
                item.enabled
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50 border-slate-200/70 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-14 h-20 rounded border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={item.dataUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain bg-white"
                  />
                </div>

                {/* Controls */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <ToggleCheck
                      checked={item.enabled}
                      onChange={(enabled) => updateItem(item.id, { enabled })}
                      label="Include in Print / PDF / Word"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, -1)}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === attachments.length - 1}
                        onClick={() => moveItem(idx, 1)}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded text-red-600 hover:bg-red-50"
                        title="Delete attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Attachment Title / Caption
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      placeholder="e.g., Appendix A: H.S.C Academic Transcript"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200">
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { layout: 'full' })}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                          item.layout === 'full'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Full-Page A4 Fit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { layout: 'two-up' })}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                          item.layout === 'two-up'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        2-Per-Page (e.g. NID Front/Back)
                      </button>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-slate-400">
                      <FileText className="w-3 h-3" />
                      {item.width}×{item.height}px
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
