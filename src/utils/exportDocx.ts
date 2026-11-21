import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { MARGIN_CONFIGS, SECTION_TITLES, THEME_CONFIGS } from '../data/presets';
import {
  AcademicColumnsConfig,
  BuiltInSectionId,
  CVDocumentState,
  LanguageRow,
} from '../types/cv';
import {
  calculateAgeFromDob,
  formatStructuredAddress,
  getPhotoAspectDimensions,
  renderHighDpiCroppedPhoto,
} from './imageAndPdf';

function stripHex(hex: string): string {
  return hex.replace('#', '').toUpperCase();
}

async function resolveImageBytes(
  src: string
): Promise<{ bytes: Uint8Array; type: 'jpg' | 'png' } | null> {
  if (!src) return null;
  try {
    let dataUrl = src;
    if (!src.startsWith('data:')) {
      const resp = await fetch(src);
      const blob = await resp.blob();
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image blob'));
        reader.readAsDataURL(blob);
      });
    }
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!match) return null;
    const fmt = match[1].toLowerCase();
    const b64 = match[2];

    // If webp, convert via canvas to png for docx compatibility
    if (fmt === 'webp') {
      const pngUrl = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          const ctx = c.getContext('2d');
          if (!ctx) return resolve(dataUrl);
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
      const pngMatch = pngUrl.match(/^data:image\/png;base64,(.+)$/i);
      if (!pngMatch) return null;
      const bin = atob(pngMatch[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
      return { bytes: arr, type: 'png' };
    }

    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      arr[i] = bin.charCodeAt(i);
    }
    return {
      bytes: arr,
      type: fmt === 'png' ? 'png' : 'jpg',
    };
  } catch {
    return null;
  }
}

function getImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || img.width || 400,
        height: img.naturalHeight || img.height || 120,
      });
    img.onerror = () => resolve({ width: 400, height: 120 });
    img.src = src;
  });
}

const ACADEMIC_COL_DEFS: { key: keyof AcademicColumnsConfig; label: string }[] = [
  { key: 'examTitle', label: 'Exam Title' },
  { key: 'group', label: 'Group / Discipline' },
  { key: 'majorSubjects', label: 'Major Subjects' },
  { key: 'institution', label: 'Institution Name' },
  { key: 'board', label: 'Board / Univ.' },
  { key: 'rollNo', label: 'Roll No.' },
  { key: 'regNo', label: 'Reg. No.' },
  { key: 'passingYear', label: 'Year' },
  { key: 'result', label: 'Result' },
];

export async function exportCVToDocx(cv: CVDocumentState): Promise<void> {
  const theme = THEME_CONFIGS[cv.theme];
  const margin = MARGIN_CONFIGS[cv.margin];
  const accentHex = stripHex(theme.accent);
  const headingHex = stripHex(theme.heading);
  const textHex = stripHex(theme.text);
  const mutedHex = stripHex(theme.muted);
  const borderHex = stripHex(theme.border);
  const accentSoftHex = stripHex(theme.accentSoft);
  const tblHeaderBgHex = stripHex(theme.tableHeaderBg);
  const tblHeaderTextHex = stripHex(theme.tableHeaderText);
  const stripeHex = stripHex(theme.stripeBg);

  const fontFamily = cv.fontStyle === 'serif' ? 'Georgia' : 'Calibri';
  const scale = cv.fontScale / 100;
  const pt = (val: number) => Math.round(val * scale * 2); // half-points

  const borderLine = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: borderHex,
  };

  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF',
  };

  const cellMarginsBalanced = {
    top: 90,
    bottom: 90,
    left: 130,
    right: 130,
  };

  const children: (Paragraph | Table)[] = [];

  // =========================================================================
  // 1. HEADER & HIGH-DPI PHOTO
  // =========================================================================
  const h = cv.header;
  const hasEnName = h.fullNameEn.enabled && h.fullNameEn.value.trim();
  const hasBnName = h.fullNameBn.enabled && h.fullNameBn.value.trim();
  const hasHeadline = h.headline.enabled && h.headline.value.trim();

  const contactParts: { label: string; value: string }[] = [];
  if (h.primaryMobile.enabled && h.primaryMobile.value.trim()) {
    contactParts.push({ label: 'Phone', value: h.primaryMobile.value.trim() });
  }
  if (h.altMobile.enabled && h.altMobile.value.trim()) {
    contactParts.push({ label: 'Alt', value: h.altMobile.value.trim() });
  }
  if (h.email.enabled && h.email.value.trim()) {
    contactParts.push({ label: 'Email', value: h.email.value.trim() });
  }
  if (h.cityCountry.enabled && h.cityCountry.value.trim()) {
    contactParts.push({ label: 'Location', value: h.cityCountry.value.trim() });
  }

  const linkParts: { label: string; value: string }[] = [];
  if (h.portfolioUrl.enabled && h.portfolioUrl.value.trim()) {
    linkParts.push({ label: 'Portfolio', value: h.portfolioUrl.value.trim() });
  }
  if (h.secondaryUrl.enabled && h.secondaryUrl.value.trim()) {
    linkParts.push({ label: 'Profile', value: h.secondaryUrl.value.trim() });
  }
  h.customFields.forEach((cf) => {
    if (cf.enabled && cf.label.trim() && cf.value.trim()) {
      linkParts.push({ label: cf.label.trim(), value: cf.value.trim() });
    }
  });

  const headerParagraphs: Paragraph[] = [];
  if (hasEnName) {
    headerParagraphs.push(
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: h.fullNameEn.value.trim(),
            bold: true,
            size: pt(20),
            color: headingHex,
            font: fontFamily,
          }),
        ],
      })
    );
  }
  if (hasBnName) {
    headerParagraphs.push(
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: h.fullNameBn.value.trim(),
            bold: true,
            size: pt(11.5),
            color: mutedHex,
            font: 'Noto Sans Bengali',
          }),
        ],
      })
    );
  }
  if (hasHeadline) {
    headerParagraphs.push(
      new Paragraph({
        spacing: { before: 0, after: 70 },
        children: [
          new TextRun({
            text: h.headline.value.trim(),
            bold: true,
            size: pt(11),
            color: accentHex,
            font: fontFamily,
          }),
        ],
      })
    );
  }
  if (contactParts.length > 0) {
    const runs: TextRun[] = [];
    contactParts.forEach((c, idx) => {
      if (idx > 0) {
        runs.push(
          new TextRun({ text: '   ·   ', size: pt(9.5), color: mutedHex, font: fontFamily })
        );
      }
      runs.push(
        new TextRun({
          text: `${c.label}: `,
          bold: true,
          size: pt(9.5),
          color: headingHex,
          font: fontFamily,
        }),
        new TextRun({
          text: c.value,
          size: pt(9.5),
          color: textHex,
          font: fontFamily,
        })
      );
    });
    headerParagraphs.push(
      new Paragraph({
        spacing: { before: 20, after: 40 },
        children: runs,
      })
    );
  }
  if (linkParts.length > 0) {
    const runs: TextRun[] = [];
    linkParts.forEach((l, idx) => {
      if (idx > 0) {
        runs.push(
          new TextRun({ text: '   ·   ', size: pt(9), color: mutedHex, font: fontFamily })
        );
      }
      runs.push(
        new TextRun({
          text: `${l.label}: `,
          bold: true,
          size: pt(9),
          color: headingHex,
          font: fontFamily,
        }),
        new TextRun({
          text: l.value,
          size: pt(9),
          color: mutedHex,
          font: fontFamily,
        })
      );
    });
    headerParagraphs.push(
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: runs,
      })
    );
  }

  let photoImageRun: ImageRun | null = null;
  if (cv.photo.enabled && cv.photo.dataUrl) {
    const cropped = await renderHighDpiCroppedPhoto(cv.photo);
    const resolved = await resolveImageBytes(cropped || cv.photo.dataUrl);
    if (resolved) {
      const dims = getPhotoAspectDimensions(cv.photo.aspect);
      // 1 mm ≈ 3.7795 px at 96dpi for docx transformation
      const pxWidth = Math.round(dims.widthMm * 3.7795);
      const pxHeight = Math.round(dims.heightMm * 3.7795);
      photoImageRun = new ImageRun({
        data: resolved.bytes,
        type: resolved.type,
        transformation: { width: pxWidth, height: pxHeight },
      });
    }
  }

  if (headerParagraphs.length > 0 || photoImageRun) {
    if (photoImageRun) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: {
            top: noBorder,
            left: noBorder,
            right: noBorder,
            insideHorizontal: noBorder,
            insideVertical: noBorder,
            bottom: { style: BorderStyle.SINGLE, size: 14, color: accentHex },
          },
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 78, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  margins: { top: 0, bottom: 120, left: 0, right: 160 },
                  borders: {
                    top: noBorder,
                    left: noBorder,
                    right: noBorder,
                    bottom: { style: BorderStyle.SINGLE, size: 14, color: accentHex },
                  },
                  children:
                    headerParagraphs.length > 0 ? headerParagraphs : [new Paragraph('')],
                }),
                new TableCell({
                  width: { size: 22, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  margins: { top: 0, bottom: 120, left: 80, right: 0 },
                  borders: {
                    top: noBorder,
                    left: noBorder,
                    right: noBorder,
                    bottom: { style: BorderStyle.SINGLE, size: 14, color: accentHex },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [photoImageRun],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      headerParagraphs.forEach((p) => {
        children.push(p);
      });
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 120 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 14, color: accentHex },
          },
          children: [],
        })
      );
    }
  }

  // =========================================================================
  // SECTION HELPERS
  // =========================================================================
  const addSectionHeading = (title: string) => {
    children.push(
      new Paragraph({
        keepNext: true,
        spacing: { before: 200, after: 80 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 10, color: accentHex },
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: pt(11),
            color: accentHex,
            font: fontFamily,
          }),
        ],
      })
    );
  };

  const addKvTable = (rows: { label: string; value: string }[]) => {
    if (rows.length === 0) return;
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: borderLine,
          bottom: borderLine,
          left: borderLine,
          right: borderLine,
          insideHorizontal: borderLine,
          insideVertical: borderLine,
        },
        rows: rows.map(
          (r, idx) =>
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 32, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  margins: cellMarginsBalanced,
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: accentSoftHex,
                    color: 'auto',
                  },
                  children: [
                    new Paragraph({
                      spacing: { before: 0, after: 0 },
                      children: [
                        new TextRun({
                          text: r.label,
                          bold: true,
                          size: pt(9.5),
                          color: headingHex,
                          font: fontFamily,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 68, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  margins: cellMarginsBalanced,
                  shading:
                    idx % 2 === 1
                      ? { type: ShadingType.CLEAR, fill: stripeHex, color: 'auto' }
                      : undefined,
                  children: [
                    new Paragraph({
                      spacing: { before: 0, after: 0 },
                      children: [
                        new TextRun({
                          text: r.value,
                          size: pt(9.5),
                          color: textHex,
                          font: fontFamily,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
        ),
      })
    );
  };

  // =========================================================================
  // 2. SECTIONS IN USER PRIORITY ORDER (ONLY CHECKED & NON-EMPTY)
  // =========================================================================
  for (const secKey of cv.sectionOrder) {
    if (secKey.startsWith('custom_')) {
      const customId = secKey.replace(/^custom_/, '');
      const sec = cv.customSections.find((s) => s.id === customId);
      if (!sec || !sec.enabled || !sec.title.trim()) continue;
      const activeItems = sec.items.filter(
        (it) => it.enabled && (it.label.trim() || it.value.trim())
      );
      if (activeItems.length === 0) continue;

      addSectionHeading(sec.title.trim());
      if (sec.layout === 'keyvalue') {
        addKvTable(
          activeItems.map((it) => ({
            label: it.label.trim() || 'Item',
            value: it.value.trim() || it.label.trim(),
          }))
        );
      } else if (sec.layout === 'bullets') {
        activeItems.forEach((it) => {
          const runs: TextRun[] = [
            new TextRun({
              text: '•  ',
              bold: true,
              size: pt(9.5),
              color: accentHex,
              font: fontFamily,
            }),
          ];
          if (it.label.trim()) {
            runs.push(
              new TextRun({
                text: `${it.label.trim()}: `,
                bold: true,
                size: pt(9.5),
                color: headingHex,
                font: fontFamily,
              })
            );
          }
          if (it.value.trim()) {
            runs.push(
              new TextRun({
                text: it.value.trim(),
                size: pt(9.5),
                color: textHex,
                font: fontFamily,
              })
            );
          }
          children.push(
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: runs,
            })
          );
        });
      } else {
        // 2-column grid table
        const pairs: typeof activeItems[] = [];
        for (let i = 0; i < activeItems.length; i += 2) {
          pairs.push(activeItems.slice(i, i + 2));
        }
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: borderLine,
              bottom: borderLine,
              left: borderLine,
              right: borderLine,
              insideHorizontal: borderLine,
              insideVertical: borderLine,
            },
            rows: pairs.map(
              (pair) =>
                new TableRow({
                  cantSplit: true,
                  children: [0, 1].map((slot) => {
                    const item = pair[slot];
                    return new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.CENTER,
                      margins: cellMarginsBalanced,
                      shading: {
                        type: ShadingType.CLEAR,
                        fill: stripeHex,
                        color: 'auto',
                      },
                      children: item
                        ? [
                            ...(item.label.trim()
                              ? [
                                  new Paragraph({
                                    spacing: { before: 0, after: 20 },
                                    children: [
                                      new TextRun({
                                        text: item.label.trim(),
                                        bold: true,
                                        size: pt(9.5),
                                        color: headingHex,
                                        font: fontFamily,
                                      }),
                                    ],
                                  }),
                                ]
                              : []),
                            ...(item.value.trim()
                              ? [
                                  new Paragraph({
                                    spacing: { before: 0, after: 0 },
                                    children: [
                                      new TextRun({
                                        text: item.value.trim(),
                                        size: pt(9.5),
                                        color: textHex,
                                        font: fontFamily,
                                      }),
                                    ],
                                  }),
                                ]
                              : []),
                          ]
                        : [new Paragraph('')],
                    });
                  }),
                })
            ),
          })
        );
      }
      continue;
    }

    const builtIn = secKey as BuiltInSectionId;
    switch (builtIn) {
      case 'objective': {
        if (!cv.objective.enabled || !cv.objective.value.trim()) break;
        addSectionHeading(SECTION_TITLES.objective);
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 20, after: 80, line: 276 },
            children: [
              new TextRun({
                text: cv.objective.value.trim(),
                size: pt(10),
                color: textHex,
                font: fontFamily,
              }),
            ],
          })
        );
        break;
      }

      case 'skills': {
        if (!cv.skills.enabled) break;
        const rows: { label: string; value: string }[] = [];
        if (cv.skills.typingSpeedEnabled) {
          const parts: string[] = [];
          if (cv.skills.banglaWpm.trim()) {
            parts.push(`Bangla: ${cv.skills.banglaWpm.trim()}`);
          }
          if (cv.skills.englishWpm.trim()) {
            parts.push(`English: ${cv.skills.englishWpm.trim()}`);
          }
          if (parts.length > 0) {
            rows.push({ label: 'Typing Speed', value: parts.join('  |  ') });
          }
        }
        const skillMap: [
          keyof Pick<
            typeof cv.skills,
            | 'officeTools'
            | 'webTechTools'
            | 'designTools'
            | 'aiWorkflow'
            | 'coordinationOps'
            | 'workEthicSoft'
          >,
          string,
        ][] = [
          ['officeTools', 'Office & Data Management Tools'],
          ['webTechTools', 'Web, Technical & Digital Tools'],
          ['designTools', 'Design & Visual Presentation Tools'],
          ['aiWorkflow', 'AI & Modern Workflow Efficiency'],
          ['coordinationOps', 'Coordination & Operational Strengths'],
          ['workEthicSoft', 'Core Work Ethic & Soft Skills'],
        ];
        skillMap.forEach(([k, lbl]) => {
          const f = cv.skills[k];
          if (f.enabled && f.value.trim()) {
            rows.push({ label: lbl, value: f.value.trim() });
          }
        });
        cv.skills.customFields.forEach((cf) => {
          if (cf.enabled && cf.label.trim() && cf.value.trim()) {
            rows.push({ label: cf.label.trim(), value: cf.value.trim() });
          }
        });
        if (rows.length > 0) {
          addSectionHeading(SECTION_TITLES.skills);
          addKvTable(rows);
        }
        break;
      }

      case 'experience': {
        if (!cv.experience.enabled) break;
        const activeCards = cv.experience.items
          .map((c) => ({
            ...c,
            bullets: c.bullets.map((b) => b.trim()).filter(Boolean),
          }))
          .filter(
            (c) =>
              c.enabled &&
              (c.title.trim() || c.organization.trim() || c.bullets.length > 0)
          );
        if (activeCards.length === 0) break;

        addSectionHeading(SECTION_TITLES.experience);
        activeCards.forEach((card) => {
          const metaParts = [
            card.organization.trim(),
            card.duration.trim(),
          ].filter(Boolean);

          const cardParas: Paragraph[] = [];
          const titleRuns: TextRun[] = [
            new TextRun({
              text: card.title.trim() || 'Project / Role',
              bold: true,
              size: pt(10.5),
              color: headingHex,
              font: fontFamily,
            }),
          ];
          if (card.badge.trim()) {
            titleRuns.push(
              new TextRun({
                text: `   [${card.badge.trim()}]`,
                bold: true,
                size: pt(9),
                color: accentHex,
                font: fontFamily,
              })
            );
          }
          cardParas.push(
            new Paragraph({
              spacing: { before: 40, after: 20 },
              children: titleRuns,
            })
          );

          if (metaParts.length > 0) {
            cardParas.push(
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: metaParts.join('  ·  '),
                    size: pt(9.2),
                    color: mutedHex,
                    font: fontFamily,
                  }),
                ],
              })
            );
          }

          card.bullets.forEach((b) => {
            cardParas.push(
              new Paragraph({
                spacing: { before: 15, after: 25 },
                indent: { left: 260, hanging: 140 },
                children: [
                  new TextRun({
                    text: '•  ',
                    bold: true,
                    size: pt(9.5),
                    color: accentHex,
                    font: fontFamily,
                  }),
                  new TextRun({
                    text: b,
                    size: pt(9.5),
                    color: textHex,
                    font: fontFamily,
                  }),
                ],
              })
            );
          });

          // Wrap each project card in a single-cell borderless table with cantSplit: true
          // so Word never splits a project card awkwardly across pages!
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorder,
                left: noBorder,
                right: noBorder,
                insideHorizontal: noBorder,
                insideVertical: noBorder,
                bottom: { style: BorderStyle.DASHED, size: 4, color: borderHex },
              },
              rows: [
                new TableRow({
                  cantSplit: true,
                  children: [
                    new TableCell({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.CENTER,
                      margins: { top: 40, bottom: 80, left: 0, right: 0 },
                      borders: {
                        top: noBorder,
                        left: noBorder,
                        right: noBorder,
                        bottom: {
                          style: BorderStyle.DASHED,
                          size: 4,
                          color: borderHex,
                        },
                      },
                      children: cardParas,
                    }),
                  ],
                }),
              ],
            })
          );
        });
        break;
      }

      case 'readiness': {
        if (!cv.readiness.enabled) break;
        const rows: { label: string; value: string }[] = [];
        const rFields: [
          keyof Omit<typeof cv.readiness, 'enabled' | 'customFields'>,
          string,
        ][] = [
          ['preferredSectors', 'Preferred Sectors / Roles'],
          ['employmentType', 'Employment Type'],
          ['workMode', 'Work Mode'],
          ['shiftFlexibility', 'Shift & Schedule Flexibility'],
          ['joiningAvailability', 'Joining Availability'],
          ['relocationTravel', 'Relocation & Travel Willingness'],
          ['workstationInternet', 'Workstation & Internet Readiness'],
          ['expectedSalary', 'Expected Compensation'],
          ['legalConductRecord', 'Legal & Conduct Record'],
        ];
        rFields.forEach(([k, lbl]) => {
          const f = cv.readiness[k];
          if (f.enabled && f.value.trim()) {
            rows.push({ label: lbl, value: f.value.trim() });
          }
        });
        cv.readiness.customFields.forEach((cf) => {
          if (cf.enabled && cf.label.trim() && cf.value.trim()) {
            rows.push({ label: cf.label.trim(), value: cf.value.trim() });
          }
        });
        if (rows.length > 0) {
          addSectionHeading(SECTION_TITLES.readiness);
          addKvTable(rows);
        }
        break;
      }

      case 'academic': {
        if (!cv.academic.enabled) break;
        const activeCols = ACADEMIC_COL_DEFS.filter(
          (c) => cv.academic.columns[c.key]
        );
        if (activeCols.length === 0) break;
        const activeRows = cv.academic.rows.filter(
          (r) =>
            r.enabled &&
            activeCols.some((c) => String(r[c.key] || '').trim().length > 0)
        );
        if (activeRows.length === 0) break;

        addSectionHeading(SECTION_TITLES.academic);
        const colPct = Math.floor(100 / activeCols.length);

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: borderLine,
              bottom: borderLine,
              left: borderLine,
              right: borderLine,
              insideHorizontal: borderLine,
              insideVertical: borderLine,
            },
            rows: [
              new TableRow({
                tableHeader: true,
                cantSplit: true,
                children: activeCols.map(
                  (col) =>
                    new TableCell({
                      width: { size: colPct, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.CENTER,
                      margins: { top: 85, bottom: 85, left: 90, right: 90 },
                      shading: {
                        type: ShadingType.CLEAR,
                        fill: tblHeaderBgHex,
                        color: 'auto',
                      },
                      children: [
                        new Paragraph({
                          spacing: { before: 0, after: 0 },
                          children: [
                            new TextRun({
                              text: col.label,
                              bold: true,
                              size: pt(8.8),
                              color: tblHeaderTextHex,
                              font: fontFamily,
                            }),
                          ],
                        }),
                      ],
                    })
                ),
              }),
              ...activeRows.map(
                (r, rIdx) =>
                  new TableRow({
                    cantSplit: true,
                    children: activeCols.map(
                      (col) =>
                        new TableCell({
                          width: { size: colPct, type: WidthType.PERCENTAGE },
                          verticalAlign: VerticalAlign.CENTER,
                          margins: { top: 85, bottom: 85, left: 90, right: 90 },
                          shading:
                            rIdx % 2 === 1
                              ? {
                                  type: ShadingType.CLEAR,
                                  fill: stripeHex,
                                  color: 'auto',
                                }
                              : undefined,
                          children: [
                            new Paragraph({
                              spacing: { before: 0, after: 0 },
                              children: [
                                new TextRun({
                                  text: String(r[col.key] || ''),
                                  bold:
                                    col.key === 'examTitle' || col.key === 'result',
                                  size: pt(8.8),
                                  color: textHex,
                                  font: fontFamily,
                                }),
                              ],
                            }),
                          ],
                        })
                    ),
                  })
              ),
            ],
          })
        );
        break;
      }

      case 'languages': {
        if (!cv.languages.enabled) break;
        const activeRows = cv.languages.rows.filter(
          (r) => r.enabled && r.language.trim()
        );
        if (activeRows.length === 0) break;

        const allCols: { key: keyof LanguageRow; label: string }[] = [
          { key: 'language', label: 'Language' },
          { key: 'reading', label: 'Reading' },
          { key: 'writing', label: 'Writing' },
          { key: 'speaking', label: 'Speaking' },
          { key: 'listening', label: 'Listening' },
          { key: 'typing', label: 'Typing' },
        ];
        const activeCols = allCols.filter(
          (c) =>
            c.key === 'language' ||
            activeRows.some((r) => String(r[c.key] || '').trim().length > 0)
        );
        const colPct = Math.floor(100 / activeCols.length);

        addSectionHeading(SECTION_TITLES.languages);
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: borderLine,
              bottom: borderLine,
              left: borderLine,
              right: borderLine,
              insideHorizontal: borderLine,
              insideVertical: borderLine,
            },
            rows: [
              new TableRow({
                tableHeader: true,
                cantSplit: true,
                children: activeCols.map(
                  (col) =>
                    new TableCell({
                      width: { size: colPct, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.CENTER,
                      margins: { top: 85, bottom: 85, left: 100, right: 100 },
                      shading: {
                        type: ShadingType.CLEAR,
                        fill: tblHeaderBgHex,
                        color: 'auto',
                      },
                      children: [
                        new Paragraph({
                          spacing: { before: 0, after: 0 },
                          children: [
                            new TextRun({
                              text: col.label,
                              bold: true,
                              size: pt(9),
                              color: tblHeaderTextHex,
                              font: fontFamily,
                            }),
                          ],
                        }),
                      ],
                    })
                ),
              }),
              ...activeRows.map(
                (r, rIdx) =>
                  new TableRow({
                    cantSplit: true,
                    children: activeCols.map(
                      (col) =>
                        new TableCell({
                          width: { size: colPct, type: WidthType.PERCENTAGE },
                          verticalAlign: VerticalAlign.CENTER,
                          margins: { top: 85, bottom: 85, left: 100, right: 100 },
                          shading:
                            rIdx % 2 === 1
                              ? {
                                  type: ShadingType.CLEAR,
                                  fill: stripeHex,
                                  color: 'auto',
                                }
                              : undefined,
                          children: [
                            new Paragraph({
                              spacing: { before: 0, after: 0 },
                              children: [
                                new TextRun({
                                  text: String(r[col.key] || ''),
                                  bold: col.key === 'language',
                                  size: pt(9),
                                  color: textHex,
                                  font: fontFamily,
                                }),
                              ],
                            }),
                          ],
                        })
                    ),
                  })
              ),
            ],
          })
        );
        break;
      }

      case 'biodata': {
        if (!cv.biodata.enabled) break;
        const rows: { label: string; value: string }[] = [];
        const fmtBi = (en: string, bn: string) => {
          const e = en.trim();
          const b = bn.trim();
          if (e && b) return `${e} (${b})`;
          return e || b;
        };
        if (cv.biodata.fatherName.enabled) {
          const val = fmtBi(cv.biodata.fatherName.en, cv.biodata.fatherName.bn);
          if (val) rows.push({ label: "Father's Name", value: val });
        }
        if (
          cv.biodata.fatherOccupation.enabled &&
          cv.biodata.fatherOccupation.value.trim()
        ) {
          rows.push({
            label: "Father's Occupation",
            value: cv.biodata.fatherOccupation.value.trim(),
          });
        }
        if (cv.biodata.motherName.enabled) {
          const val = fmtBi(cv.biodata.motherName.en, cv.biodata.motherName.bn);
          if (val) rows.push({ label: "Mother's Name", value: val });
        }
        if (
          cv.biodata.motherOccupation.enabled &&
          cv.biodata.motherOccupation.value.trim()
        ) {
          rows.push({
            label: "Mother's Occupation",
            value: cv.biodata.motherOccupation.value.trim(),
          });
        }
        if (cv.biodata.dateOfBirth.enabled && cv.biodata.dateOfBirth.value.trim()) {
          const raw = cv.biodata.dateOfBirth.value.trim();
          const parsed = new Date(raw);
          const formatted = Number.isNaN(parsed.getTime())
            ? raw
            : parsed.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });
          rows.push({ label: 'Date of Birth', value: formatted });
        }
        if (cv.biodata.age.enabled) {
          const ageVal = cv.biodata.age.autoCalculate
            ? calculateAgeFromDob(cv.biodata.dateOfBirth.value)
            : cv.biodata.age.manualValue.trim();
          if (ageVal) rows.push({ label: 'Age', value: ageVal });
        }

        const bioMap: [
          keyof Pick<
            typeof cv.biodata,
            | 'nidNumber'
            | 'birthRegNumber'
            | 'passportNumber'
            | 'drivingLicense'
            | 'nationality'
            | 'religion'
            | 'gender'
            | 'maritalStatus'
            | 'bloodGroup'
            | 'height'
            | 'emergencyContactPerson'
            | 'emergencyContactMobile'
          >,
          string,
        ][] = [
          ['nidNumber', 'National ID (NID) No.'],
          ['birthRegNumber', 'Birth Registration No.'],
          ['passportNumber', 'Passport No.'],
          ['drivingLicense', 'Driving License No.'],
          ['nationality', 'Nationality'],
          ['religion', 'Religion'],
          ['gender', 'Gender'],
          ['maritalStatus', 'Marital Status'],
          ['bloodGroup', 'Blood Group'],
          ['height', 'Height'],
          ['emergencyContactPerson', 'Emergency Contact Person'],
          ['emergencyContactMobile', 'Emergency Contact Mobile'],
        ];
        bioMap.forEach(([k, lbl]) => {
          const f = cv.biodata[k];
          if (f.enabled && f.value.trim()) {
            rows.push({ label: lbl, value: f.value.trim() });
          }
        });
        cv.biodata.customFields.forEach((cf) => {
          if (cf.enabled && cf.label.trim() && cf.value.trim()) {
            rows.push({ label: cf.label.trim(), value: cf.value.trim() });
          }
        });

        if (rows.length > 0) {
          addSectionHeading(SECTION_TITLES.biodata);
          addKvTable(rows);
        }
        break;
      }

      case 'addresses': {
        if (!cv.addresses.enabled) break;
        const rows: { label: string; value: string }[] = [];
        if (cv.addresses.present.enabled) {
          const t = formatStructuredAddress(cv.addresses.present);
          if (t) rows.push({ label: 'Present Address', value: t });
        }
        if (cv.addresses.permanent.enabled) {
          const t = formatStructuredAddress(cv.addresses.permanent);
          if (t) rows.push({ label: 'Permanent Address', value: t });
        }
        cv.addresses.customFields.forEach((cf) => {
          if (cf.enabled && cf.label.trim() && cf.value.trim()) {
            rows.push({ label: cf.label.trim(), value: cf.value.trim() });
          }
        });
        if (rows.length > 0) {
          addSectionHeading(SECTION_TITLES.addresses);
          addKvTable(rows);
        }
        break;
      }

      case 'references': {
        if (!cv.references.enabled) break;
        const activeRefs = cv.references.items.filter(
          (r) =>
            r.enabled &&
            (r.name.trim() ||
              r.designation.trim() ||
              r.organization.trim() ||
              r.phone.trim() ||
              r.email.trim())
        );
        const customNotes = cv.references.customFields.filter(
          (cf) => cf.enabled && cf.label.trim() && cf.value.trim()
        );
        if (activeRefs.length === 0 && customNotes.length === 0) break;

        addSectionHeading(SECTION_TITLES.references);
        if (activeRefs.length > 0) {
          const pairs: typeof activeRefs[] = [];
          for (let i = 0; i < activeRefs.length; i += 2) {
            pairs.push(activeRefs.slice(i, i + 2));
          }
          const isSingle = activeRefs.length === 1;
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: borderLine,
                bottom: borderLine,
                left: borderLine,
                right: borderLine,
                insideHorizontal: borderLine,
                insideVertical: borderLine,
              },
              rows: pairs.map(
                (pair) =>
                  new TableRow({
                    cantSplit: true,
                    children: (isSingle ? [0] : [0, 1]).map((slot) => {
                      const refItem = pair[slot];
                      if (!refItem) {
                        return new TableCell({
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          verticalAlign: VerticalAlign.CENTER,
                          margins: cellMarginsBalanced,
                          children: [new Paragraph('')],
                        });
                      }
                      const refParas: Paragraph[] = [];
                      if (refItem.name.trim()) {
                        refParas.push(
                          new Paragraph({
                            spacing: { before: 0, after: 20 },
                            children: [
                              new TextRun({
                                text: refItem.name.trim(),
                                bold: true,
                                size: pt(9.5),
                                color: headingHex,
                                font: fontFamily,
                              }),
                            ],
                          })
                        );
                      }
                      if (refItem.designation.trim()) {
                        refParas.push(
                          new Paragraph({
                            spacing: { before: 0, after: 20 },
                            children: [
                              new TextRun({
                                text: refItem.designation.trim(),
                                bold: true,
                                size: pt(9),
                                color: accentHex,
                                font: fontFamily,
                              }),
                            ],
                          })
                        );
                      }
                      if (refItem.organization.trim()) {
                        refParas.push(
                          new Paragraph({
                            spacing: { before: 0, after: 20 },
                            children: [
                              new TextRun({
                                text: refItem.organization.trim(),
                                size: pt(9),
                                color: textHex,
                                font: fontFamily,
                              }),
                            ],
                          })
                        );
                      }
                      if (refItem.phone.trim()) {
                        refParas.push(
                          new Paragraph({
                            spacing: { before: 20, after: 10 },
                            children: [
                              new TextRun({
                                text: `Phone: ${refItem.phone.trim()}`,
                                size: pt(8.8),
                                color: mutedHex,
                                font: fontFamily,
                              }),
                            ],
                          })
                        );
                      }
                      if (refItem.email.trim()) {
                        refParas.push(
                          new Paragraph({
                            spacing: { before: 0, after: 0 },
                            children: [
                              new TextRun({
                                text: `Email: ${refItem.email.trim()}`,
                                size: pt(8.8),
                                color: mutedHex,
                                font: fontFamily,
                              }),
                            ],
                          })
                        );
                      }
                      return new TableCell({
                        width: {
                          size: isSingle ? 100 : 50,
                          type: WidthType.PERCENTAGE,
                        },
                        verticalAlign: VerticalAlign.CENTER,
                        margins: cellMarginsBalanced,
                        shading: {
                          type: ShadingType.CLEAR,
                          fill: stripeHex,
                          color: 'auto',
                        },
                        children: refParas,
                      });
                    }),
                  })
              ),
            })
          );
        }

        customNotes.forEach((n) => {
          children.push(
            new Paragraph({
              spacing: { before: 40, after: 20 },
              children: [
                new TextRun({
                  text: `${n.label.trim()}: `,
                  bold: true,
                  size: pt(9.2),
                  color: headingHex,
                  font: fontFamily,
                }),
                new TextRun({
                  text: n.value.trim(),
                  size: pt(9.2),
                  color: textHex,
                  font: fontFamily,
                }),
              ],
            })
          );
        });
        break;
      }

      case 'enclosures': {
        if (!cv.enclosures.enabled) break;
        const activeItems = cv.enclosures.items
          .filter((it) => it.enabled && it.label.trim())
          .map((it) => it.label.trim());
        if (activeItems.length === 0) break;

        addSectionHeading(SECTION_TITLES.enclosures);
        activeItems.forEach((lbl) => {
          children.push(
            new Paragraph({
              spacing: { before: 15, after: 25 },
              indent: { left: 240, hanging: 140 },
              children: [
                new TextRun({
                  text: '•  ',
                  bold: true,
                  size: pt(9.5),
                  color: accentHex,
                  font: fontFamily,
                }),
                new TextRun({
                  text: lbl,
                  size: pt(9.5),
                  color: textHex,
                  font: fontFamily,
                }),
              ],
            })
          );
        });
        break;
      }

      case 'declaration': {
        if (!cv.declaration.enabled) break;
        const decl = cv.declaration;
        const showStatement =
          decl.statementEnabled !== false && Boolean(decl.statement.trim());
        const showDate = decl.date.enabled && Boolean(decl.date.value.trim());
        const showSignature = decl.signatureEnabled !== false;
        if (!showStatement && !showDate && !showSignature) break;

        addSectionHeading(SECTION_TITLES.declaration);

        if (showStatement) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 20, after: showDate || showSignature ? 220 : 40, line: 276 },
              children: [
                new TextRun({
                  text: decl.statement.trim(),
                  size: pt(9.8),
                  color: textHex,
                  font: fontFamily,
                }),
              ],
            })
          );
        }

        if (showDate || showSignature) {
          const applicantName = (
            decl.applicantNameOverride.trim() ||
            (cv.header.fullNameEn.enabled ? cv.header.fullNameEn.value.trim() : '')
          ).toUpperCase();

          const sigCellChildren: Paragraph[] = [];
          if (showSignature) {
            if (decl.signatureMode === 'image' && decl.signatureImageUrl) {
              const resolvedSig = await resolveImageBytes(decl.signatureImageUrl);
              if (resolvedSig) {
                const nat = await getImageNaturalSize(decl.signatureImageUrl);
                const maxH = 36;
                const maxW = 165;
                const ratio = Math.min(maxW / nat.width, maxH / nat.height, 1);
                sigCellChildren.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 40 },
                    children: [
                      new ImageRun({
                        data: resolvedSig.bytes,
                        type: resolvedSig.type,
                        transformation: {
                          width: Math.max(20, Math.round(nat.width * ratio)),
                          height: Math.max(12, Math.round(nat.height * ratio)),
                        },
                      }),
                    ],
                  })
                );
              }
            } else if (decl.signatureMode === 'typed' && decl.typedSignature.trim()) {
              sigCellChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: decl.typedSignature.trim(),
                      italics: true,
                      bold: true,
                      size: pt(15),
                      color: headingHex,
                      font: 'Georgia',
                    }),
                  ],
                })
              );
            } else {
              sigCellChildren.push(
                new Paragraph({ spacing: { before: 240, after: 40 }, children: [] })
              );
            }

            // Horizontal signature line + "Signature of Applicant" below
            sigCellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                border: {
                  top: { style: BorderStyle.SINGLE, size: 6, color: headingHex, space: 4 },
                },
                children: [
                  new TextRun({
                    text: 'Signature of Applicant',
                    bold: true,
                    size: pt(9),
                    color: textHex,
                    font: fontFamily,
                  }),
                ],
              })
            );

            if (applicantName) {
              sigCellChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({
                      text: applicantName,
                      bold: true,
                      size: pt(9),
                      color: headingHex,
                      font: fontFamily,
                    }),
                  ],
                })
              );
            }
          }

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: noBorder,
                bottom: noBorder,
                left: noBorder,
                right: noBorder,
                insideHorizontal: noBorder,
                insideVertical: noBorder,
              },
              rows: [
                new TableRow({
                  cantSplit: true,
                  children: [
                    new TableCell({
                      width: { size: 52, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.BOTTOM,
                      margins: { top: 40, bottom: 20, left: 0, right: 120 },
                      borders: {
                        top: noBorder,
                        bottom: noBorder,
                        left: noBorder,
                        right: noBorder,
                      },
                      children: showDate
                        ? [
                            new Paragraph({
                              spacing: { before: 0, after: 40 },
                              children: [
                                new TextRun({
                                  text: 'Date: ',
                                  bold: true,
                                  size: pt(9.5),
                                  color: headingHex,
                                  font: fontFamily,
                                }),
                                new TextRun({
                                  text: decl.date.value.trim(),
                                  size: pt(9.5),
                                  color: textHex,
                                  font: fontFamily,
                                }),
                              ],
                            }),
                          ]
                        : [new Paragraph('')],
                    }),
                    new TableCell({
                      width: { size: 48, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.BOTTOM,
                      margins: { top: 40, bottom: 20, left: 120, right: 0 },
                      borders: {
                        top: noBorder,
                        bottom: noBorder,
                        left: noBorder,
                        right: noBorder,
                      },
                      children:
                        sigCellChildren.length > 0
                          ? sigCellChildren
                          : [new Paragraph('')],
                    }),
                  ],
                }),
              ],
            })
          );
        }
        break;
      }
    }
  }

  // =========================================================================
  // 3. SUPPORTING EVIDENCE & ATTACHMENTS (APPENDED A4 PAGES)
  // =========================================================================
  const activeAttachments = cv.attachments.filter((a) => a.enabled && a.dataUrl);
  if (activeAttachments.length > 0) {
    const printableWidthPx = Math.round((210 - margin.leftMm - margin.rightMm) * 3.7795);
    const printableHeightPx = Math.round((297 - margin.topMm - margin.bottomMm - 18) * 3.7795);

    let i = 0;
    while (i < activeAttachments.length) {
      const curr = activeAttachments[i];
      children.push(new Paragraph({ children: [new PageBreak()] }));

      if (curr.layout === 'two-up') {
        const pair = [curr];
        if (activeAttachments[i + 1]?.layout === 'two-up') {
          pair.push(activeAttachments[i + 1]);
          i += 2;
        } else {
          i += 1;
        }

        const maxEachH = Math.round((printableHeightPx - 60) / 2);
        for (const item of pair) {
          if (item.title.trim()) {
            children.push(
              new Paragraph({
                keepNext: true,
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: item.title.trim(),
                    bold: true,
                    size: pt(10),
                    color: accentHex,
                    font: fontFamily,
                  }),
                ],
              })
            );
          }
          const resolved = await resolveImageBytes(item.dataUrl);
          if (resolved) {
            const nat = await getImageNaturalSize(item.dataUrl);
            const ratio = Math.min(printableWidthPx / nat.width, maxEachH / nat.height);
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 100 },
                children: [
                  new ImageRun({
                    data: resolved.bytes,
                    type: resolved.type,
                    transformation: {
                      width: Math.max(40, Math.round(nat.width * ratio)),
                      height: Math.max(40, Math.round(nat.height * ratio)),
                    },
                  }),
                ],
              })
            );
          }
        }
      } else {
        i += 1;
        if (curr.title.trim()) {
          children.push(
            new Paragraph({
              keepNext: true,
              spacing: { before: 0, after: 60 },
              children: [
                new TextRun({
                  text: curr.title.trim(),
                  bold: true,
                  size: pt(10.5),
                  color: accentHex,
                  font: fontFamily,
                }),
              ],
            })
          );
        }
        const resolved = await resolveImageBytes(curr.dataUrl);
        if (resolved) {
          const nat = await getImageNaturalSize(curr.dataUrl);
          const ratio = Math.min(
            printableWidthPx / nat.width,
            printableHeightPx / nat.height
          );
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new ImageRun({
                  data: resolved.bytes,
                  type: resolved.type,
                  transformation: {
                    width: Math.max(40, Math.round(nat.width * ratio)),
                    height: Math.max(40, Math.round(nat.height * ratio)),
                  },
                }),
              ],
            })
          );
        }
      }
    }
  }

  // Build A4 Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(margin.topMm),
              bottom: convertMillimetersToTwip(margin.bottomMm),
              left: convertMillimetersToTwip(margin.leftMm),
              right: convertMillimetersToTwip(margin.rightMm),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const namePart =
    cv.header.fullNameEn.enabled && cv.header.fullNameEn.value.trim()
      ? cv.header.fullNameEn.value.trim()
      : 'Master_CV';
  const safeName = namePart
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  saveAs(blob, `${safeName || 'Master_CV'}_BioData.docx`);
}
