import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { AddressBlock, AttachmentItem, PhotoSettings } from '../types/cv';

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNumber: number) => Promise<{
            getViewport: (opts: { scale: number }) => { width: number; height: number };
            render: (ctx: {
              canvasContext: CanvasRenderingContext2D;
              viewport: { width: number; height: number };
            }) => { promise: Promise<void> };
          }>;
        }>;
      };
    };
  }
}

const PDFJS_SCRIPT_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLoadPromise: Promise<NonNullable<Window['pdfjsLib']>> | null = null;

function ensurePdfJsLoaded(): Promise<NonNullable<Window['pdfjsLib']>> {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfjsLoadPromise) {
    return pdfjsLoadPromise;
  }

  pdfjsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PDFJS_SCRIPT_URL}"]`
    );

    const onReady = () => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
      } else {
        pdfjsLoadPromise = null;
        reject(
          new Error(
            'PDF.js engine failed to initialize. Please check network access and retry.'
          )
        );
      }
    };

    const onFail = () => {
      pdfjsLoadPromise = null;
      reject(
        new Error(
          'PDF.js engine could not be loaded. Please check network access and retry.'
        )
      );
    };

    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', onFail, { once: true });
      window.setTimeout(() => {
        if (window.pdfjsLib) resolve(window.pdfjsLib);
      }, 300);
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = onReady;
    script.onerror = onFail;
    document.head.appendChild(script);
  });

  return pdfjsLoadPromise;
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function calculateAgeFromDob(dobStr: string): string {
  if (!dobStr.trim()) return '';
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    years -= 1;
  }
  if (years < 0 || years > 120) return '';
  return `${years} Years`;
}

export function formatStructuredAddress(addr: AddressBlock): string {
  const parts: string[] = [];
  if (addr.careOf.trim()) parts.push(`C/O: ${addr.careOf.trim()}`);
  if (addr.villageRoad.trim()) parts.push(addr.villageRoad.trim());
  if (addr.wardUnion.trim()) parts.push(addr.wardUnion.trim());

  const poParts: string[] = [];
  if (addr.postOffice.trim()) poParts.push(`P.O.: ${addr.postOffice.trim()}`);
  if (addr.postCode.trim()) poParts.push(addr.postCode.trim());
  if (poParts.length > 0) parts.push(poParts.join(' - '));

  if (addr.upazila.trim()) parts.push(`P.S./Upazila: ${addr.upazila.trim()}`);
  if (addr.district.trim()) parts.push(`Dist.: ${addr.district.trim()}`);
  if (addr.division.trim()) parts.push(`${addr.division.trim()} Division`);

  return parts.join(', ');
}

export function getPhotoAspectDimensions(aspect: PhotoSettings['aspect']): {
  ratio: number;
  widthMm: number;
  heightMm: number;
  exportWidthPx: number;
  exportHeightPx: number;
} {
  if (aspect === '1x1') {
    return {
      ratio: 1,
      widthMm: 34,
      heightMm: 34,
      exportWidthPx: 1020,
      exportHeightPx: 1020,
    };
  }
  if (aspect === '4x5') {
    return {
      ratio: 4 / 5,
      widthMm: 32,
      heightMm: 40,
      exportWidthPx: 960,
      exportHeightPx: 1200,
    };
  }
  // 35x45 passport portrait
  return {
    ratio: 35 / 45,
    widthMm: 31,
    heightMm: 39.85,
    exportWidthPx: 1050,
    exportHeightPx: 1350,
  };
}

export function readHighResImageFile(file: File, maxDimension = 3840): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const src = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const longest = Math.max(origW, origH);
        const scale = longest > maxDimension ? maxDimension / longest : 1;
        const targetW = Math.round(origW * scale);
        const targetH = Math.round(origH * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: src, width: origW, height: origH });
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
        const outUrl = hasAlpha
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.96);
        resolve({ dataUrl: outUrl, width: targetW, height: targetH });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Renders the user's photo with zoom, panX, panY, brightness, contrast
 * into a crisp 300+ DPI canvas dataURL for preview, PDF & Word output.
 */
export async function renderHighDpiCroppedPhoto(
  photo: PhotoSettings
): Promise<string> {
  if (!photo.dataUrl) return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const dims = getPhotoAspectDimensions(photo.aspect);
      const canvas = document.createElement('canvas');
      canvas.width = dims.exportWidthPx;
      canvas.height = dims.exportHeightPx;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(photo.dataUrl);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = `brightness(${photo.brightness}%) contrast(${photo.contrast}%)`;

      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;

      // Cover fit base scale
      const baseScale = Math.max(canvas.width / imgW, canvas.height / imgH);
      const totalScale = baseScale * photo.zoom;

      const drawW = imgW * totalScale;
      const drawH = imgH * totalScale;

      // Clamp pan offset within excess cover bounds so edges never show blank gaps
      const maxPanX = Math.max(0, (drawW - canvas.width) / 2);
      const maxPanY = Math.max(0, (drawH - canvas.height) / 2);
      const rawOffsetX = (photo.panX / 100) * canvas.width;
      const rawOffsetY = (photo.panY / 100) * canvas.height;
      const clampedX = Math.max(-maxPanX, Math.min(maxPanX, rawOffsetX));
      const clampedY = Math.max(-maxPanY, Math.min(maxPanY, rawOffsetY));

      const drawX = (canvas.width - drawW) / 2 + clampedX;
      const drawY = (canvas.height - drawH) / 2 + clampedY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      resolve(canvas.toDataURL('image/jpeg', 0.96));
    };
    img.onerror = () => resolve(photo.dataUrl);
    img.src = photo.dataUrl;
  });
}

/**
 * Strips light/white paper background from a scanned signature image
 * so it renders cleanly above the signature line with transparent PNG background.
 */
export function cleanSignatureBackground(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 205) {
          d[i + 3] = 0;
        } else if (lum > 165) {
          // Smooth anti-aliased edge
          const alpha = Math.round(((205 - lum) / 40) * 255);
          d[i + 3] = Math.min(d[i + 3], alpha);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not process signature image.'));
    img.src = dataUrl;
  });
}

export async function parsePdfFileToAttachments(
  file: File,
  baseTitle?: string
): Promise<AttachmentItem[]> {
  const pdfjs = await ensurePdfJsLoaded();
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: buffer }).promise;
  const totalPages = pdfDoc.numPages;
  const cleanName = (baseTitle || file.name.replace(/\.pdf$/i, '')).trim();
  const items: AttachmentItem[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
    const page = await pdfDoc.getPage(pageNum);
    // High-DPI scale (~2.5x gives crisp 1500px-2000px+ page canvas)
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
    items.push({
      id: uid('att'),
      enabled: true,
      title:
        totalPages > 1
          ? `${cleanName} — Page ${pageNum} of ${totalPages}`
          : cleanName,
      layout: 'full',
      dataUrl,
      sourceFileName: file.name,
      pageLabel: totalPages > 1 ? `Page ${pageNum}/${totalPages}` : undefined,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return items;
}

export async function parseImageFileToAttachment(
  file: File
): Promise<AttachmentItem> {
  const { dataUrl, width, height } = await readHighResImageFile(file, 2400);
  const cleanName = file.name.replace(/\.(png|jpe?g|webp)$/i, '').trim();
  return {
    id: uid('att'),
    enabled: true,
    title: cleanName || 'Supporting Document',
    layout: 'full',
    dataUrl,
    sourceFileName: file.name,
    width,
    height,
  };
}

export async function exportA4SheetsToPdf(
  sheetElements: HTMLElement[],
  filename: string
): Promise<void> {
  if (sheetElements.length === 0) {
    throw new Error('No A4 pages available to export.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < sheetElements.length; i += 1) {
    const el = sheetElements[i];
    let canvas: HTMLCanvasElement;
    try {
      canvas = await toCanvas(el, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: false,
        skipAutoScale: true,
      });
    } catch {
      canvas = await toCanvas(el, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: false,
        skipAutoScale: true,
        skipFonts: true,
      });
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  const safeName = filename
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  pdf.save(`${safeName || 'Master_CV_BioData'}.pdf`);
}

export function printA4Sheets(
  sheetElements: HTMLElement[],
  documentTitle = 'Master CV & Bio-Data'
): 'window' | 'iframe' | 'fallback' {
  if (sheetElements.length === 0) {
    window.print();
    return 'fallback';
  }

  const sheetsHtml = sheetElements.map((el) => el.outerHTML).join('\n');
  const escapedTitle = documentTitle.replace(/[<>&"]/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      default:
        return '&quot;';
    }
  });

  const standaloneHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapedTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1e293b;
    }
    .font-cv-sans {
      font-family: 'Plus Jakarta Sans', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .font-cv-serif {
      font-family: 'Source Serif 4', 'Noto Sans Bengali', Georgia, serif;
    }
    .a4-sheet {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .a4-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .a4-sheet img {
      image-rendering: high-quality;
    }
    .cv-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }
    .cv-table th,
    .cv-table td {
      vertical-align: middle !important;
      line-height: 1.38;
      padding: 5.5px 8px;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .cv-table tr,
    .kv-row,
    .cv-section-block,
    .proj-card,
    .cv-keep-together,
    .a4-sheet-footer {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cv-section-heading {
      break-after: avoid;
      page-break-after: avoid;
    }
    .cv-typed-signature {
      font-family: 'Source Serif 4', Georgia, serif;
      font-style: italic;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  ${sheetsHtml}
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 150);
    });
  </script>
</body>
</html>`;

  // Primary: standalone print window
  try {
    const printWin = window.open('', '_blank', 'width=900,height=1100');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(standaloneHtml);
      printWin.document.close();
      return 'window';
    }
  } catch {
    // Popup blocked; fall through to hidden iframe fallback
  }

  // Fallback 1: hidden sandbox-safe iframe print view
  try {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(standaloneHtml.replace(/<script>[\s\S]*?<\/script>/i, ''));
      doc.close();
      window.setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        window.setTimeout(() => {
          iframe.remove();
        }, 1500);
      }, 200);
      return 'iframe';
    }
    iframe.remove();
  } catch {
    // Fall through to current-document @media print
  }

  // Fallback 2: direct @media print on main page
  window.print();
  return 'fallback';
}

