import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  FileJson,
  FileText,
  FolderUp,
  Loader2,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { A4PreviewWorkspace } from './components/A4PreviewWorkspace';
import { AttachmentsManager } from './components/AttachmentsManager';
import { EditorPanels } from './components/EditorPanels';
import {
  SECTOR_CONFIGS,
  applySectorAdaptation,
  createEmptyProfile,
  createSampleProfile,
} from './data/presets';
import { CVDocumentState, SectorMode } from './types/cv';
import { exportCVToDocx } from './utils/exportDocx';
import { exportA4SheetsToPdf, printA4Sheets } from './utils/imageAndPdf';

const STORAGE_KEY = 'master_cv_biodata_studio_v1';

function loadInitialState(): CVDocumentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CVDocumentState>;
      const base = createSampleProfile();
      return {
        ...base,
        ...parsed,
        header: { ...base.header, ...parsed.header },
        photo: { ...base.photo, ...parsed.photo },
        objective: { ...base.objective, ...parsed.objective },
        skills: { ...base.skills, ...parsed.skills },
        experience: { ...base.experience, ...parsed.experience },
        readiness: { ...base.readiness, ...parsed.readiness },
        academic: {
          ...base.academic,
          ...parsed.academic,
          columns: { ...base.academic.columns, ...parsed.academic?.columns },
        },
        languages: { ...base.languages, ...parsed.languages },
        biodata: { ...base.biodata, ...parsed.biodata },
        addresses: {
          ...base.addresses,
          ...parsed.addresses,
          present: { ...base.addresses.present, ...parsed.addresses?.present },
          permanent: { ...base.addresses.permanent, ...parsed.addresses?.permanent },
        },
        references: { ...base.references, ...parsed.references },
        enclosures: { ...base.enclosures, ...parsed.enclosures },
        declaration: { ...base.declaration, ...parsed.declaration },
        customSections: parsed.customSections ?? base.customSections,
        attachments: parsed.attachments ?? base.attachments,
        sectionOrder: parsed.sectionOrder ?? base.sectionOrder,
      };
    }
  } catch {
    // Fall back to sample profile if storage is unreadable
  }
  return createSampleProfile();
}

export default function App() {
  const [cv, setCv] = useState<CVDocumentState>(loadInitialState);
  const [leftTab, setLeftTab] = useState<'editor' | 'attachments'>('editor');
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const quotaWarnedRef = useRef(false);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3400);
  }, []);

  // Automatic localStorage persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
    } catch {
      // If giant PDF attachments exceed localStorage ~5MB limit, save CV without attachment blobs
      try {
        const slim = { ...cv, attachments: [] };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
        if (!quotaWarnedRef.current && cv.attachments.length > 0) {
          quotaWarnedRef.current = true;
          notify(
            'Attachments exceed browser autosave limit (~5MB). Use Export JSON for full backup.'
          );
        }
      } catch {
        // Ignore if storage unavailable
      }
    }
  }, [cv, notify]);

  const handleSectorChange = (nextSector: SectorMode) => {
    setCv((prev) => applySectorAdaptation(prev, nextSector));
    notify(`Adapted layout & headline for ${SECTOR_CONFIGS[nextSector].shortLabel}`);
  };

  const handleDownloadPdf = async () => {
    const validSheets = sheetRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );
    if (validSheets.length === 0) {
      notify('No A4 pages to export.');
      return;
    }
    setIsExportingPdf(true);
    try {
      const namePart = cv.header.fullNameEn.enabled && cv.header.fullNameEn.value.trim()
        ? cv.header.fullNameEn.value.trim()
        : 'Master_CV';
      await exportA4SheetsToPdf(validSheets, `${namePart}_CV_BioData`);
      notify(`Exported ${validSheets.length}-page A4 PDF successfully`);
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : 'Failed to generate PDF. Please try Print to PDF.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportCVToDocx(cv);
      notify('Editable Word (.docx) document downloaded');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Failed to generate Word (.docx) file.'
      );
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrint = () => {
    const validSheets = sheetRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );
    const title =
      cv.header.fullNameEn.enabled && cv.header.fullNameEn.value.trim()
        ? `${cv.header.fullNameEn.value.trim()} — CV & Bio-Data`
        : 'Master CV & Bio-Data';
    const mode = printA4Sheets(validSheets, title);
    if (mode === 'iframe') {
      notify('Opened sandbox-safe print preview');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(cv, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const namePart =
      cv.header.fullNameEn.value.trim().replace(/\s+/g, '_') || 'master_cv_backup';
    a.href = url;
    a.download = `${namePart}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('JSON backup exported');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<CVDocumentState>;
      const base = createEmptyProfile();
      setCv({
        ...base,
        ...parsed,
        header: { ...base.header, ...parsed.header },
        photo: { ...base.photo, ...parsed.photo },
        objective: { ...base.objective, ...parsed.objective },
        skills: { ...base.skills, ...parsed.skills },
        experience: { ...base.experience, ...parsed.experience },
        readiness: { ...base.readiness, ...parsed.readiness },
        academic: {
          ...base.academic,
          ...parsed.academic,
          columns: { ...base.academic.columns, ...parsed.academic?.columns },
        },
        languages: { ...base.languages, ...parsed.languages },
        biodata: { ...base.biodata, ...parsed.biodata },
        addresses: {
          ...base.addresses,
          ...parsed.addresses,
          present: { ...base.addresses.present, ...parsed.addresses?.present },
          permanent: { ...base.addresses.permanent, ...parsed.addresses?.permanent },
        },
        references: { ...base.references, ...parsed.references },
        enclosures: { ...base.enclosures, ...parsed.enclosures },
        declaration: { ...base.declaration, ...parsed.declaration },
        customSections: parsed.customSections ?? [],
        attachments: parsed.attachments ?? [],
        sectionOrder: parsed.sectionOrder ?? base.sectionOrder,
      });
      notify('JSON profile imported successfully');
    } catch {
      notify('Invalid JSON backup file.');
    } finally {
      e.target.value = '';
    }
  };

  const activeAttachmentCount = cv.attachments.filter((a) => a.enabled).length;

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      {/* Top Studio Bar */}
      <header className="no-print h-13 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[15px] font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Master CV & Bio-Data Studio
          </span>
        </div>

        {/* Center/Utility Quick Actions */}
        <nav className="hidden md:flex items-center gap-3.5 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => {
              setCv(createSampleProfile());
              setConfirmClear(false);
              notify('Sample Master Profile loaded');
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Load Sample Profile
          </button>

          {confirmClear ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCv(createEmptyProfile());
                  setConfirmClear(false);
                  notify('Profile cleared & reset');
                }}
                className="text-red-700 font-semibold hover:underline whitespace-nowrap shrink-0"
              >
                Confirm Reset
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear / Reset Profile
            </button>
          )}

          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportJson}
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <FolderUp className="w-3.5 h-3.5" />
            Import JSON
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <FileJson className="w-3.5 h-3.5" />
            Export JSON
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </nav>

        {/* Primary Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex lg:hidden items-center p-0.5 bg-slate-100 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setMobilePane('edit')}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                mobilePane === 'edit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setMobilePane('preview')}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                mobilePane === 'preview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              A4 Preview
            </button>
          </div>

          <button
            type="button"
            disabled={isExportingDocx}
            onClick={handleDownloadDocx}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {isExportingDocx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            {isExportingDocx ? 'Building DOCX...' : 'Download Word (.docx)'}
          </button>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {isExportingPdf ? 'Building PDF...' : 'Download PDF'}
          </button>
        </div>
      </header>

      {/* Split-Screen Studio Workspace */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* LEFT PANE: Granular Form Editor & Evidence Manager */}
        <aside
          className={`no-print w-full lg:w-[490px] xl:w-[540px] shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col min-h-0 ${
            mobilePane === 'edit' ? 'flex-1 lg:flex-none' : 'hidden lg:flex'
          }`}
        >
          {/* Sector Adaptation Engine Selector + Mode Tabs */}
          <div className="bg-white border-b border-slate-200 p-3.5 space-y-3 shrink-0">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="sector-selector"
                  className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-slate-900"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                  Target Sector / Mode Selector
                </label>
                <span className="text-[11px] text-slate-400">
                  Auto-adapts priority & summary
                </span>
              </div>
              <select
                id="sector-selector"
                value={cv.sector}
                onChange={(e) => handleSectorChange(e.target.value as SectorMode)}
                className="w-full px-2.5 py-2 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {Object.values(SECTOR_CONFIGS).map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                {SECTOR_CONFIGS[cv.sector].description}
              </p>
            </div>

            {/* Mobile Quick Backup/Reset Row */}
            <div className="flex md:hidden flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[11px] font-medium text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setCv(createSampleProfile());
                  setConfirmClear(false);
                  notify('Sample profile loaded');
                }}
                className="px-2 py-1 bg-slate-100 rounded"
              >
                Load Sample
              </button>
              {confirmClear ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 rounded border border-red-200">
                  <button
                    type="button"
                    onClick={() => {
                      setCv(createEmptyProfile());
                      setConfirmClear(false);
                      notify('Profile cleared & reset');
                    }}
                    className="text-red-700 font-semibold"
                  >
                    Confirm
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-slate-600"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-2 py-1 bg-slate-100 rounded text-red-700"
                >
                  Clear / Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2 py-1 bg-slate-100 rounded"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="px-2 py-1 bg-slate-100 rounded"
              >
                Import JSON
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-2 py-1 bg-slate-100 rounded"
              >
                Print
              </button>
              <button
                type="button"
                disabled={isExportingDocx}
                onClick={handleDownloadDocx}
                className="px-2 py-1 bg-slate-100 rounded"
              >
                {isExportingDocx ? 'Building...' : 'Word (.docx)'}
              </button>
            </div>

            {/* Editor Sub-Tabs: CV Fields vs Supporting Evidence */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setLeftTab('editor')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  leftTab === 'editor'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                CV & Bio-Data Fields
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('attachments')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  leftTab === 'attachments'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Evidence & Attachments ({activeAttachmentCount})
              </button>
            </div>
          </div>

          {/* Scrollable Form / Attachments Area */}
          <div className="flex-1 overflow-y-auto studio-scroll p-3.5">
            {leftTab === 'editor' ? (
              <EditorPanels cv={cv} onChange={setCv} onNotify={notify} />
            ) : (
              <AttachmentsManager
                attachments={cv.attachments}
                onChange={(attachments) =>
                  setCv((prev) => ({ ...prev, attachments }))
                }
                onNotify={notify}
              />
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Live Real-Time A4 Print Preview */}
        <section
          className={`flex-1 min-w-0 min-h-0 flex flex-col ${
            mobilePane === 'preview' ? 'flex' : 'hidden lg:flex'
          } print-only-container`}
        >
          <A4PreviewWorkspace cv={cv} onChange={setCv} sheetRefs={sheetRefs} />
        </section>
      </main>

      {/* Non-blocking Studio Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-3.5 py-2.5 rounded-md shadow-lg border border-slate-700"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
