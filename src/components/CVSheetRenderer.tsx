import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  MARGIN_CONFIGS,
  SECTION_TITLES,
  THEME_CONFIGS,
} from '../data/presets';
import {
  AcademicColumnsConfig,
  AcademicRow,
  AttachmentItem,
  BuiltInSectionId,
  CVDocumentState,
  CustomSection,
  LanguageRow,
  ProjectCardItem,
  ReferenceItem,
} from '../types/cv';
import {
  calculateAgeFromDob,
  formatStructuredAddress,
  getPhotoAspectDimensions,
  renderHighDpiCroppedPhoto,
} from '../utils/imageAndPdf';

interface CVSheetRendererProps {
  cv: CVDocumentState;
  sheetRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onPageCountChange?: (cvPages: number, attachmentPages: number) => void;
}

interface KeyValueRow {
  id: string;
  label: string;
  value: string;
}

type AtomicBlock =
  | { kind: 'header'; id: string }
  | { kind: 'section_heading'; id: string; sectionKey: string; title: string; firstItemId?: string }
  | { kind: 'objective_body'; id: string; text: string }
  | { kind: 'kv_row'; id: string; sectionKey: string; row: KeyValueRow; isLast?: boolean }
  | { kind: 'project_card'; id: string; sectionKey: string; card: ProjectCardItem }
  | { kind: 'academic_thead'; id: string; sectionKey: string; cols: { key: keyof AcademicColumnsConfig; label: string }[] }
  | { kind: 'academic_row'; id: string; sectionKey: string; row: AcademicRow; cols: { key: keyof AcademicColumnsConfig; label: string }[]; index: number }
  | { kind: 'language_thead'; id: string; sectionKey: string; cols: { key: keyof LanguageRow; label: string }[] }
  | { kind: 'language_row'; id: string; sectionKey: string; row: LanguageRow; cols: { key: keyof LanguageRow; label: string }[]; index: number }
  | { kind: 'references_grid'; id: string; sectionKey: string; items: ReferenceItem[]; customNotes: KeyValueRow[] }
  | { kind: 'enclosures_list'; id: string; sectionKey: string; items: string[] }
  | { kind: 'declaration_block'; id: string; sectionKey: string }
  | { kind: 'custom_bullets'; id: string; sectionKey: string; items: { id: string; label: string; value: string }[] }
  | { kind: 'custom_grid'; id: string; sectionKey: string; items: KeyValueRow[] };

interface AttachmentSheetPlan {
  id: string;
  items: AttachmentItem[];
  mode: 'full' | 'two-up';
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

export const CVSheetRenderer: React.FC<CVSheetRendererProps> = ({
  cv,
  sheetRefs,
  onPageCountChange,
}) => {
  const theme = THEME_CONFIGS[cv.theme];
  const margin = MARGIN_CONFIGS[cv.margin];
  const fontClass = cv.fontStyle === 'serif' ? 'font-cv-serif' : 'font-cv-sans';
  const baseFontSizePx = 10.5 * (cv.fontScale / 100);

  // High-DPI cropped photo data URL
  const [croppedPhotoUrl, setCroppedPhotoUrl] = useState<string>(cv.photo.dataUrl);
  useEffect(() => {
    let cancelled = false;
    if (!cv.photo.enabled || !cv.photo.dataUrl) {
      setCroppedPhotoUrl('');
      return;
    }
    renderHighDpiCroppedPhoto(cv.photo).then((url) => {
      if (!cancelled) setCroppedPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [
    cv.photo.enabled,
    cv.photo.dataUrl,
    cv.photo.zoom,
    cv.photo.panX,
    cv.photo.panY,
    cv.photo.brightness,
    cv.photo.contrast,
    cv.photo.aspect,
  ]);

  // Build ordered atomic blocks strictly honoring Zero-Empty-Field rules
  const blocks = useMemo<AtomicBlock[]>(() => {
    const out: AtomicBlock[] = [{ kind: 'header', id: 'header' }];

    const addKvSection = (sectionKey: string, title: string, rows: KeyValueRow[]) => {
      if (rows.length === 0) return;
      out.push({
        kind: 'section_heading',
        id: `head_${sectionKey}`,
        sectionKey,
        title,
        firstItemId: rows[0].id,
      });
      rows.forEach((row, idx) => {
        out.push({
          kind: 'kv_row',
          id: row.id,
          sectionKey,
          row,
          isLast: idx === rows.length - 1,
        });
      });
    };

    for (const secKey of cv.sectionOrder) {
      if (secKey.startsWith('custom_')) {
        const customId = secKey.replace(/^custom_/, '');
        const sec: CustomSection | undefined = cv.customSections.find(
          (s) => s.id === customId
        );
        if (!sec || !sec.enabled || !sec.title.trim()) continue;
        const activeItems = sec.items.filter(
          (it) => it.enabled && (it.label.trim() || it.value.trim())
        );
        if (activeItems.length === 0) continue;

        if (sec.layout === 'keyvalue') {
          addKvSection(
            secKey,
            sec.title.trim(),
            activeItems.map((it) => ({
              id: `c_${sec.id}_${it.id}`,
              label: it.label.trim() || 'Item',
              value: it.value.trim() || it.label.trim(),
            }))
          );
        } else if (sec.layout === 'bullets') {
          const itemId = `cb_${sec.id}`;
          out.push({
            kind: 'section_heading',
            id: `head_${secKey}`,
            sectionKey: secKey,
            title: sec.title.trim(),
            firstItemId: itemId,
          });
          out.push({
            kind: 'custom_bullets',
            id: itemId,
            sectionKey: secKey,
            items: activeItems.map((it) => ({
              id: it.id,
              label: it.label.trim(),
              value: it.value.trim(),
            })),
          });
        } else {
          const itemId = `cg_${sec.id}`;
          out.push({
            kind: 'section_heading',
            id: `head_${secKey}`,
            sectionKey: secKey,
            title: sec.title.trim(),
            firstItemId: itemId,
          });
          out.push({
            kind: 'custom_grid',
            id: itemId,
            sectionKey: secKey,
            items: activeItems.map((it) => ({
              id: it.id,
              label: it.label.trim(),
              value: it.value.trim(),
            })),
          });
        }
        continue;
      }

      const builtIn = secKey as BuiltInSectionId;
      switch (builtIn) {
        case 'objective': {
          if (cv.objective.enabled && cv.objective.value.trim()) {
            const bodyId = 'objective_body';
            out.push({
              kind: 'section_heading',
              id: 'head_objective',
              sectionKey: 'objective',
              title: SECTION_TITLES.objective,
              firstItemId: bodyId,
            });
            out.push({
              kind: 'objective_body',
              id: bodyId,
              text: cv.objective.value.trim(),
            });
          }
          break;
        }

        case 'skills': {
          if (!cv.skills.enabled) break;
          const rows: KeyValueRow[] = [];
          if (cv.skills.typingSpeedEnabled) {
            const parts: string[] = [];
            if (cv.skills.banglaWpm.trim()) {
              parts.push(`Bangla: ${cv.skills.banglaWpm.trim()}`);
            }
            if (cv.skills.englishWpm.trim()) {
              parts.push(`English: ${cv.skills.englishWpm.trim()}`);
            }
            if (parts.length > 0) {
              rows.push({
                id: 'sk_typing',
                label: 'Typing Speed',
                value: parts.join('  |  '),
              });
            }
          }
          const skillFields: [
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
          skillFields.forEach(([k, lbl]) => {
            const fld = cv.skills[k];
            if (fld.enabled && fld.value.trim()) {
              rows.push({ id: `sk_${k}`, label: lbl, value: fld.value.trim() });
            }
          });
          cv.skills.customFields.forEach((cf) => {
            if (cf.enabled && cf.label.trim() && cf.value.trim()) {
              rows.push({
                id: `sk_cf_${cf.id}`,
                label: cf.label.trim(),
                value: cf.value.trim(),
              });
            }
          });
          addKvSection('skills', SECTION_TITLES.skills, rows);
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

          out.push({
            kind: 'section_heading',
            id: 'head_experience',
            sectionKey: 'experience',
            title: SECTION_TITLES.experience,
            firstItemId: `exp_${activeCards[0].id}`,
          });
          activeCards.forEach((card) => {
            out.push({
              kind: 'project_card',
              id: `exp_${card.id}`,
              sectionKey: 'experience',
              card,
            });
          });
          break;
        }

        case 'readiness': {
          if (!cv.readiness.enabled) break;
          const rows: KeyValueRow[] = [];
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
            const fld = cv.readiness[k];
            if (fld.enabled && fld.value.trim()) {
              rows.push({ id: `rd_${k}`, label: lbl, value: fld.value.trim() });
            }
          });
          cv.readiness.customFields.forEach((cf) => {
            if (cf.enabled && cf.label.trim() && cf.value.trim()) {
              rows.push({
                id: `rd_cf_${cf.id}`,
                label: cf.label.trim(),
                value: cf.value.trim(),
              });
            }
          });
          addKvSection('readiness', SECTION_TITLES.readiness, rows);
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

          out.push({
            kind: 'section_heading',
            id: 'head_academic',
            sectionKey: 'academic',
            title: SECTION_TITLES.academic,
            firstItemId: `acad_row_${activeRows[0].id}`,
          });
          out.push({
            kind: 'academic_thead',
            id: 'acad_thead',
            sectionKey: 'academic',
            cols: activeCols,
          });
          activeRows.forEach((row, index) => {
            out.push({
              kind: 'academic_row',
              id: `acad_row_${row.id}`,
              sectionKey: 'academic',
              row,
              cols: activeCols,
              index,
            });
          });
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

          out.push({
            kind: 'section_heading',
            id: 'head_languages',
            sectionKey: 'languages',
            title: SECTION_TITLES.languages,
            firstItemId: `lang_row_${activeRows[0].id}`,
          });
          out.push({
            kind: 'language_thead',
            id: 'lang_thead',
            sectionKey: 'languages',
            cols: activeCols,
          });
          activeRows.forEach((row, index) => {
            out.push({
              kind: 'language_row',
              id: `lang_row_${row.id}`,
              sectionKey: 'languages',
              row,
              cols: activeCols,
              index,
            });
          });
          break;
        }

        case 'biodata': {
          if (!cv.biodata.enabled) break;
          const rows: KeyValueRow[] = [];

          const formatBilingual = (en: string, bn: string) => {
            const e = en.trim();
            const b = bn.trim();
            if (e && b) return `${e} (${b})`;
            return e || b;
          };

          if (cv.biodata.fatherName.enabled) {
            const val = formatBilingual(
              cv.biodata.fatherName.en,
              cv.biodata.fatherName.bn
            );
            if (val) rows.push({ id: 'bio_fname', label: "Father's Name", value: val });
          }
          if (
            cv.biodata.fatherOccupation.enabled &&
            cv.biodata.fatherOccupation.value.trim()
          ) {
            rows.push({
              id: 'bio_focc',
              label: "Father's Occupation",
              value: cv.biodata.fatherOccupation.value.trim(),
            });
          }
          if (cv.biodata.motherName.enabled) {
            const val = formatBilingual(
              cv.biodata.motherName.en,
              cv.biodata.motherName.bn
            );
            if (val) rows.push({ id: 'bio_mname', label: "Mother's Name", value: val });
          }
          if (
            cv.biodata.motherOccupation.enabled &&
            cv.biodata.motherOccupation.value.trim()
          ) {
            rows.push({
              id: 'bio_mocc',
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
            rows.push({ id: 'bio_dob', label: 'Date of Birth', value: formatted });
          }
          if (cv.biodata.age.enabled) {
            const ageVal = cv.biodata.age.autoCalculate
              ? calculateAgeFromDob(cv.biodata.dateOfBirth.value)
              : cv.biodata.age.manualValue.trim();
            if (ageVal) rows.push({ id: 'bio_age', label: 'Age', value: ageVal });
          }

          const simpleBioFields: [
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

          simpleBioFields.forEach(([k, lbl]) => {
            const fld = cv.biodata[k];
            if (fld.enabled && fld.value.trim()) {
              rows.push({ id: `bio_${k}`, label: lbl, value: fld.value.trim() });
            }
          });

          cv.biodata.customFields.forEach((cf) => {
            if (cf.enabled && cf.label.trim() && cf.value.trim()) {
              rows.push({
                id: `bio_cf_${cf.id}`,
                label: cf.label.trim(),
                value: cf.value.trim(),
              });
            }
          });

          addKvSection('biodata', SECTION_TITLES.biodata, rows);
          break;
        }

        case 'addresses': {
          if (!cv.addresses.enabled) break;
          const rows: KeyValueRow[] = [];
          if (cv.addresses.present.enabled) {
            const text = formatStructuredAddress(cv.addresses.present);
            if (text) {
              rows.push({ id: 'addr_pres', label: 'Present Address', value: text });
            }
          }
          if (cv.addresses.permanent.enabled) {
            const text = formatStructuredAddress(cv.addresses.permanent);
            if (text) {
              rows.push({ id: 'addr_perm', label: 'Permanent Address', value: text });
            }
          }
          cv.addresses.customFields.forEach((cf) => {
            if (cf.enabled && cf.label.trim() && cf.value.trim()) {
              rows.push({
                id: `addr_cf_${cf.id}`,
                label: cf.label.trim(),
                value: cf.value.trim(),
              });
            }
          });
          addKvSection('addresses', SECTION_TITLES.addresses, rows);
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
          const customNotes: KeyValueRow[] = cv.references.customFields
            .filter((cf) => cf.enabled && cf.label.trim() && cf.value.trim())
            .map((cf) => ({
              id: `ref_cf_${cf.id}`,
              label: cf.label.trim(),
              value: cf.value.trim(),
            }));
          if (activeRefs.length === 0 && customNotes.length === 0) break;

          const gridId = 'references_grid';
          out.push({
            kind: 'section_heading',
            id: 'head_references',
            sectionKey: 'references',
            title: SECTION_TITLES.references,
            firstItemId: gridId,
          });
          out.push({
            kind: 'references_grid',
            id: gridId,
            sectionKey: 'references',
            items: activeRefs,
            customNotes,
          });
          break;
        }

        case 'enclosures': {
          if (!cv.enclosures.enabled) break;
          const items = cv.enclosures.items
            .filter((it) => it.enabled && it.label.trim())
            .map((it) => it.label.trim());
          if (items.length === 0) break;

          const listId = 'enclosures_list';
          out.push({
            kind: 'section_heading',
            id: 'head_enclosures',
            sectionKey: 'enclosures',
            title: SECTION_TITLES.enclosures,
            firstItemId: listId,
          });
          out.push({
            kind: 'enclosures_list',
            id: listId,
            sectionKey: 'enclosures',
            items,
          });
          break;
        }

        case 'declaration': {
          if (!cv.declaration.enabled) break;
          const hasStatement =
            cv.declaration.statementEnabled !== false &&
            Boolean(cv.declaration.statement.trim());
          const hasDate =
            cv.declaration.date.enabled && Boolean(cv.declaration.date.value.trim());
          const hasSig = cv.declaration.signatureEnabled !== false;
          if (!hasStatement && !hasDate && !hasSig) break;

          const declId = 'declaration_block';
          out.push({
            kind: 'section_heading',
            id: 'head_declaration',
            sectionKey: 'declaration',
            title: SECTION_TITLES.declaration,
            firstItemId: declId,
          });
          out.push({
            kind: 'declaration_block',
            id: declId,
            sectionKey: 'declaration',
          });
          break;
        }
      }
    }

    return out;
  }, [cv]);

  // Dedicated bottom footer zone (20mm-24mm) so content never overlaps footer or bottom edge
  const footerZoneMm =
    cv.margin === 'compact' ? 20 : cv.margin === 'wide' ? 24 : 22;
  const contentBoxHeightMm = Math.max(120, 297 - margin.topMm - footerZoneMm);

  // Measure atomic blocks inside offscreen A4 width stage & pack into exact A4 pages
  const measureStageRef = useRef<HTMLDivElement>(null);
  const calibrationRef = useRef<HTMLDivElement>(null);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pages, setPages] = useState<AtomicBlock[][]>([blocks]);
  const [fontReadyTick, setFontReadyTick] = useState(0);
  const [extraSafetyMm, setExtraSafetyMm] = useState(0);

  useEffect(() => {
    let active = true;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (active) setFontReadyTick((t) => t + 1);
      });
    }
    return () => {
      active = false;
    };
  }, [cv.fontStyle]);

  useEffect(() => {
    setExtraSafetyMm(0);
  }, [blocks, margin, cv.fontScale, cv.fontStyle, croppedPhotoUrl, fontReadyTick]);

  useLayoutEffect(() => {
    const stage = measureStageRef.current;
    const cal = calibrationRef.current;
    if (!stage || !cal) return;

    const sheetRect = cal.getBoundingClientRect();
    const pxPerMm = sheetRect.height > 0 ? sheetRect.height / 297 : 96 / 25.4;
    const safetyBufferMm = 3.5 + extraSafetyMm;
    const maxContentHeightPx =
      (contentBoxHeightMm - safetyBufferMm) * pxPerMm;

    const metrics: Record<string, { total: number; mt: number; mb: number }> = {};
    const nodes = stage.querySelectorAll<HTMLElement>('[data-block-id]');
    nodes.forEach((node) => {
      const bid = node.dataset.blockId;
      if (bid) {
        const rectH = node.getBoundingClientRect().height;
        const cs = window.getComputedStyle(node);
        const mt = parseFloat(cs.marginTop) || 0;
        const mb = parseFloat(cs.marginBottom) || 0;
        metrics[bid] = { total: rectH + mt + mb, mt, mb };
      }
    });

    const getMetric = (b: AtomicBlock) =>
      metrics[b.id] ?? { total: 24, mt: 0, mb: 0 };

    const packed: AtomicBlock[][] = [];
    let currentPage: AtomicBlock[] = [];
    let usedHeight = 0;

    const TABLE_FRAME_OVERHEAD_PX = 9; // border-top + border-bottom + table marginBottom + subpixel guard

    const startNewPage = () => {
      if (currentPage.length > 0) {
        packed.push(currentPage);
      }
      currentPage = [];
      usedHeight = 0;
    };

    for (let i = 0; i < blocks.length; i += 1) {
      const b = blocks[i];
      const m = getMetric(b);
      const lastOnPage = currentPage[currentPage.length - 1];

      if (b.kind === 'section_heading') {
        // Keep section heading together with its first item (and thead if table)
        const next1 = blocks[i + 1];
        const next2 = blocks[i + 2];
        let required = m.total;
        if (next1) {
          required += getMetric(next1).total;
          if (
            next1.kind === 'kv_row' ||
            next1.kind === 'academic_thead' ||
            next1.kind === 'language_thead'
          ) {
            required += TABLE_FRAME_OVERHEAD_PX;
          }
        }
        if (
          next1 &&
          (next1.kind === 'academic_thead' || next1.kind === 'language_thead') &&
          next2
        ) {
          required += getMetric(next2).total;
        }

        if (currentPage.length > 0 && usedHeight + required > maxContentHeightPx) {
          startNewPage();
        }
        const effectiveHeadingH =
          currentPage.length === 0 ? Math.max(0, m.total - m.mt) : m.total;
        currentPage.push(b);
        usedHeight += effectiveHeadingH;
        continue;
      }

      if (b.kind === 'academic_thead' || b.kind === 'language_thead') {
        currentPage.push(b);
        usedHeight += m.total + TABLE_FRAME_OVERHEAD_PX;
        continue;
      }

      const startsNewKvTable =
        b.kind === 'kv_row' &&
        (!lastOnPage ||
          lastOnPage.kind !== 'kv_row' ||
          lastOnPage.sectionKey !== b.sectionKey);
      const rowExtra = startsNewKvTable ? TABLE_FRAME_OVERHEAD_PX : 0;

      if (
        currentPage.length > 0 &&
        usedHeight + m.total + rowExtra > maxContentHeightPx
      ) {
        startNewPage();
        // If breaking mid-academic or mid-language table, repeat thead!
        if (b.kind === 'academic_row') {
          const thead = blocks.find(
            (x) => x.kind === 'academic_thead' && x.sectionKey === b.sectionKey
          );
          if (thead) {
            currentPage.push(thead);
            usedHeight += getMetric(thead).total + TABLE_FRAME_OVERHEAD_PX;
          }
        } else if (b.kind === 'language_row') {
          const thead = blocks.find(
            (x) => x.kind === 'language_thead' && x.sectionKey === b.sectionKey
          );
          if (thead) {
            currentPage.push(thead);
            usedHeight += getMetric(thead).total + TABLE_FRAME_OVERHEAD_PX;
          }
        }
      }

      const isNowFirstKvOnPage =
        b.kind === 'kv_row' &&
        (currentPage.length === 0 ||
          currentPage[currentPage.length - 1].kind !== 'kv_row' ||
          (currentPage[currentPage.length - 1] as Extract<AtomicBlock, { kind: 'kv_row' }>)
            .sectionKey !== b.sectionKey);

      currentPage.push(b);
      usedHeight += m.total + (isNowFirstKvOnPage ? TABLE_FRAME_OVERHEAD_PX : 0);
    }

    if (currentPage.length > 0) {
      packed.push(currentPage);
    }

    setPages(packed.length > 0 ? packed : [[]]);
  }, [
    blocks,
    margin,
    contentBoxHeightMm,
    extraSafetyMm,
    cv.fontScale,
    cv.fontStyle,
    croppedPhotoUrl,
    fontReadyTick,
  ]);

  // Post-render verification: if any page body overflows its dedicated height, add safety cushion
  useLayoutEffect(() => {
    if (extraSafetyMm >= 15) return;
    for (let idx = 0; idx < pages.length; idx += 1) {
      const el = bodyRefs.current[idx];
      if (el && el.scrollHeight > el.clientHeight + 1.5) {
        setExtraSafetyMm((prev) => Math.min(15, prev + 3));
        break;
      }
    }
  }, [pages, extraSafetyMm]);

  // Build attachment sheets (full-page vs 2-per-page pairing)
  const attachmentSheets = useMemo<AttachmentSheetPlan[]>(() => {
    const active = cv.attachments.filter((a) => a.enabled && a.dataUrl);
    const sheets: AttachmentSheetPlan[] = [];
    let i = 0;
    while (i < active.length) {
      const curr = active[i];
      if (curr.layout === 'two-up') {
        const next = active[i + 1];
        if (next && next.layout === 'two-up') {
          sheets.push({
            id: `att_sheet_${curr.id}_${next.id}`,
            items: [curr, next],
            mode: 'two-up',
          });
          i += 2;
        } else {
          sheets.push({
            id: `att_sheet_${curr.id}`,
            items: [curr],
            mode: 'two-up',
          });
          i += 1;
        }
      } else {
        sheets.push({
          id: `att_sheet_${curr.id}`,
          items: [curr],
          mode: 'full',
        });
        i += 1;
      }
    }
    return sheets;
  }, [cv.attachments]);

  useEffect(() => {
    if (sheetRefs) {
      sheetRefs.current = sheetRefs.current.slice(0, pages.length + attachmentSheets.length);
    }
    onPageCountChange?.(pages.length, attachmentSheets.length);
  }, [pages.length, attachmentSheets.length, onPageCountChange, sheetRefs]);

  // Helper to render header block
  const renderHeaderBlock = () => {
    const h = cv.header;
    const photoDims = getPhotoAspectDimensions(cv.photo.aspect);
    const showPhoto = cv.photo.enabled && Boolean(croppedPhotoUrl || cv.photo.dataUrl);

    const contactItems: { label?: string; value: string }[] = [];
    if (h.primaryMobile.enabled && h.primaryMobile.value.trim()) {
      contactItems.push({ label: 'Phone', value: h.primaryMobile.value.trim() });
    }
    if (h.altMobile.enabled && h.altMobile.value.trim()) {
      contactItems.push({ label: 'Alt', value: h.altMobile.value.trim() });
    }
    if (h.email.enabled && h.email.value.trim()) {
      contactItems.push({ label: 'Email', value: h.email.value.trim() });
    }
    if (h.cityCountry.enabled && h.cityCountry.value.trim()) {
      contactItems.push({ label: 'Location', value: h.cityCountry.value.trim() });
    }

    const linkItems: { label: string; value: string }[] = [];
    if (h.portfolioUrl.enabled && h.portfolioUrl.value.trim()) {
      linkItems.push({ label: 'Portfolio', value: h.portfolioUrl.value.trim() });
    }
    if (h.secondaryUrl.enabled && h.secondaryUrl.value.trim()) {
      linkItems.push({ label: 'Profile', value: h.secondaryUrl.value.trim() });
    }
    h.customFields.forEach((cf) => {
      if (cf.enabled && cf.label.trim() && cf.value.trim()) {
        linkItems.push({ label: cf.label.trim(), value: cf.value.trim() });
      }
    });

    const hasEnName = h.fullNameEn.enabled && h.fullNameEn.value.trim();
    const hasBnName = h.fullNameBn.enabled && h.fullNameBn.value.trim();
    const hasHeadline = h.headline.enabled && h.headline.value.trim();

    return (
      <div
        style={{
          borderBottom: `2px solid ${theme.accent}`,
          paddingBottom: '10px',
          marginBottom: '11px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasEnName && (
            <h1
              style={{
                margin: 0,
                fontSize: `${baseFontSizePx * 2.05}px`,
                lineHeight: 1.15,
                fontWeight: 700,
                color: theme.heading,
                letterSpacing: '-0.015em',
              }}
            >
              {h.fullNameEn.value.trim()}
            </h1>
          )}

          {hasBnName && (
            <div
              style={{
                marginTop: hasEnName ? '3px' : 0,
                fontSize: `${baseFontSizePx * 1.12}px`,
                lineHeight: 1.3,
                fontWeight: 600,
                color: theme.muted,
                fontFamily: "'Noto Sans Bengali', sans-serif",
              }}
            >
              {h.fullNameBn.value.trim()}
            </div>
          )}

          {hasHeadline && (
            <div
              style={{
                marginTop: '4px',
                fontSize: `${baseFontSizePx * 1.08}px`,
                lineHeight: 1.32,
                fontWeight: 600,
                color: theme.accent,
              }}
            >
              {h.headline.value.trim()}
            </div>
          )}

          {contactItems.length > 0 && (
            <div
              style={{
                marginTop: '7px',
                fontSize: `${baseFontSizePx * 0.9}px`,
                lineHeight: 1.48,
                color: theme.text,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px 12px',
              }}
            >
              {contactItems.map((c, idx) => (
                <span key={idx} style={{ whiteSpace: 'nowrap' }}>
                  <strong style={{ fontWeight: 600, color: theme.heading }}>
                    {c.label}:
                  </strong>{' '}
                  {c.value}
                </span>
              ))}
            </div>
          )}

          {linkItems.length > 0 && (
            <div
              style={{
                marginTop: '3px',
                fontSize: `${baseFontSizePx * 0.88}px`,
                lineHeight: 1.45,
                color: theme.muted,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '3px 12px',
              }}
            >
              {linkItems.map((l, idx) => (
                <span key={idx} style={{ wordBreak: 'break-all' }}>
                  <strong style={{ fontWeight: 600, color: theme.heading }}>
                    {l.label}:
                  </strong>{' '}
                  {l.value}
                </span>
              ))}
            </div>
          )}
        </div>

        {showPhoto && (
          <div
            style={{
              width: `${photoDims.widthMm}mm`,
              height: `${photoDims.heightMm}mm`,
              flexShrink: 0,
              border: `1px solid ${theme.border}`,
              padding: '2px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            <img
              src={croppedPhotoUrl || cv.photo.dataUrl}
              alt="Applicant Passport Portrait"
              referrerPolicy="no-referrer"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Render an array of AtomicBlocks for either Measurement Stage or an A4 Page
  // Groups consecutive table rows (kv_row, academic_*, language_*) into clean <table> elements
  const renderPageContent = (pageBlocks: AtomicBlock[], isMeasurement: boolean) => {
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < pageBlocks.length) {
      const b = pageBlocks[i];

      if (b.kind === 'header') {
        elements.push(
          <div key={b.id} data-block-id={isMeasurement ? b.id : undefined}>
            {renderHeaderBlock()}
          </div>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'section_heading') {
        elements.push(
          <div
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            className="cv-section-heading"
            style={{
              marginTop: i === 0 ? 0 : '10px',
              marginBottom: '5px',
              borderBottom: `1.5px solid ${theme.accent}`,
              paddingBottom: '2.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: `${baseFontSizePx * 1.08}px`,
                lineHeight: 1.25,
                fontWeight: 700,
                color: theme.accent,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              {b.title}
            </h2>
          </div>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'objective_body') {
        elements.push(
          <div
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            style={{
              fontSize: `${baseFontSizePx}px`,
              lineHeight: 1.48,
              color: theme.text,
              textAlign: 'justify',
              marginBottom: '4px',
            }}
          >
            {b.text}
          </div>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'kv_row') {
        // Group consecutive kv_rows belonging to the same section
        const secKey = b.sectionKey;
        const group: Extract<AtomicBlock, { kind: 'kv_row' }>[] = [];
        while (
          i < pageBlocks.length &&
          pageBlocks[i].kind === 'kv_row' &&
          (pageBlocks[i] as Extract<AtomicBlock, { kind: 'kv_row' }>).sectionKey === secKey
        ) {
          group.push(pageBlocks[i] as Extract<AtomicBlock, { kind: 'kv_row' }>);
          i += 1;
        }

        elements.push(
          <table
            key={`tbl_${secKey}_${group[0].id}`}
            className="cv-table"
            style={{
              marginBottom: '4px',
              border: `1px solid ${theme.border}`,
              fontSize: `${baseFontSizePx * 0.94}px`,
            }}
          >
            <tbody>
              {group.map((g, rIdx) => (
                <tr
                  key={g.id}
                  data-block-id={isMeasurement ? g.id : undefined}
                  className="kv-row"
                  style={{
                    backgroundColor: rIdx % 2 === 1 ? theme.stripeBg : '#ffffff',
                    borderBottom:
                      rIdx < group.length - 1 ? `1px solid ${theme.border}` : 'none',
                  }}
                >
                  <th
                    style={{
                      width: '31%',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: theme.heading,
                      borderRight: `1px solid ${theme.border}`,
                      backgroundColor: theme.accentSoft,
                      verticalAlign: 'middle',
                    }}
                  >
                    {g.row.label}
                  </th>
                  <td
                    style={{
                      width: '69%',
                      color: theme.text,
                      verticalAlign: 'middle',
                    }}
                  >
                    {g.row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        continue;
      }

      if (b.kind === 'project_card') {
        const card = b.card;
        const metaParts = [card.organization.trim(), card.duration.trim()].filter(
          Boolean
        );
        elements.push(
          <div
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            className="proj-card"
            style={{
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: `1px dashed ${theme.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '6px',
              }}
            >
              <div
                style={{
                  fontSize: `${baseFontSizePx * 1.03}px`,
                  fontWeight: 700,
                  color: theme.heading,
                  lineHeight: 1.3,
                }}
              >
                {card.title.trim()}
              </div>
              {card.badge.trim() && (
                <div
                  style={{
                    fontSize: `${baseFontSizePx * 0.85}px`,
                    fontWeight: 600,
                    color: theme.accent,
                  }}
                >
                  {card.badge.trim()}
                </div>
              )}
            </div>

            {metaParts.length > 0 && (
              <div
                style={{
                  marginTop: '2px',
                  fontSize: `${baseFontSizePx * 0.9}px`,
                  fontWeight: 500,
                  color: theme.muted,
                  lineHeight: 1.35,
                }}
              >
                {metaParts.join('  ·  ')}
              </div>
            )}

            {card.bullets.length > 0 && (
              <ul
                style={{
                  margin: '4px 0 0 0',
                  paddingLeft: '15px',
                  fontSize: `${baseFontSizePx * 0.94}px`,
                  lineHeight: 1.42,
                  color: theme.text,
                }}
              >
                {card.bullets.map((bullet, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'academic_thead' || b.kind === 'academic_row') {
        let thead: Extract<AtomicBlock, { kind: 'academic_thead' }> | null = null;
        const rows: Extract<AtomicBlock, { kind: 'academic_row' }>[] = [];

        if (b.kind === 'academic_thead') {
          thead = b;
          i += 1;
        }
        while (i < pageBlocks.length && pageBlocks[i].kind === 'academic_row') {
          rows.push(pageBlocks[i] as Extract<AtomicBlock, { kind: 'academic_row' }>);
          i += 1;
        }
        const cols = thead?.cols || rows[0]?.cols || [];

        elements.push(
          <table
            key={`acad_tbl_${rows[0]?.id || thead?.id}`}
            className="cv-table"
            style={{
              marginBottom: '5px',
              border: `1px solid ${theme.border}`,
              fontSize: `${baseFontSizePx * 0.86}px`,
            }}
          >
            {thead && (
              <thead>
                <tr
                  data-block-id={isMeasurement ? thead.id : undefined}
                  style={{
                    backgroundColor: theme.tableHeaderBg,
                    color: theme.tableHeaderText,
                  }}
                >
                  {cols.map((col, cIdx) => (
                    <th
                      key={col.key}
                      style={{
                        textAlign: 'left',
                        fontWeight: 600,
                        borderRight:
                          cIdx < cols.length - 1
                            ? `1px solid rgba(255,255,255,0.22)`
                            : 'none',
                        verticalAlign: 'middle',
                        whiteSpace:
                          col.key === 'passingYear' || col.key === 'rollNo'
                            ? 'nowrap'
                            : 'normal',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, rIdx) => (
                <tr
                  key={r.id}
                  data-block-id={isMeasurement ? r.id : undefined}
                  style={{
                    backgroundColor: rIdx % 2 === 1 ? theme.stripeBg : '#ffffff',
                    borderTop: `1px solid ${theme.border}`,
                  }}
                >
                  {cols.map((col, cIdx) => (
                    <td
                      key={col.key}
                      style={{
                        color: theme.text,
                        fontWeight: col.key === 'examTitle' || col.key === 'result' ? 600 : 400,
                        borderRight:
                          cIdx < cols.length - 1
                            ? `1px solid ${theme.border}`
                            : 'none',
                        verticalAlign: 'middle',
                        whiteSpace:
                          col.key === 'passingYear' || col.key === 'rollNo'
                            ? 'nowrap'
                            : 'normal',
                      }}
                    >
                      {String(r.row[col.key] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
        continue;
      }

      if (b.kind === 'language_thead' || b.kind === 'language_row') {
        let thead: Extract<AtomicBlock, { kind: 'language_thead' }> | null = null;
        const rows: Extract<AtomicBlock, { kind: 'language_row' }>[] = [];

        if (b.kind === 'language_thead') {
          thead = b;
          i += 1;
        }
        while (i < pageBlocks.length && pageBlocks[i].kind === 'language_row') {
          rows.push(pageBlocks[i] as Extract<AtomicBlock, { kind: 'language_row' }>);
          i += 1;
        }
        const cols = thead?.cols || rows[0]?.cols || [];

        elements.push(
          <table
            key={`lang_tbl_${rows[0]?.id || thead?.id}`}
            className="cv-table"
            style={{
              marginBottom: '5px',
              border: `1px solid ${theme.border}`,
              fontSize: `${baseFontSizePx * 0.89}px`,
            }}
          >
            {thead && (
              <thead>
                <tr
                  data-block-id={isMeasurement ? thead.id : undefined}
                  style={{
                    backgroundColor: theme.tableHeaderBg,
                    color: theme.tableHeaderText,
                  }}
                >
                  {cols.map((col, cIdx) => (
                    <th
                      key={col.key}
                      style={{
                        textAlign: 'left',
                        fontWeight: 600,
                        borderRight:
                          cIdx < cols.length - 1
                            ? `1px solid rgba(255,255,255,0.22)`
                            : 'none',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, rIdx) => (
                <tr
                  key={r.id}
                  data-block-id={isMeasurement ? r.id : undefined}
                  style={{
                    backgroundColor: rIdx % 2 === 1 ? theme.stripeBg : '#ffffff',
                    borderTop: `1px solid ${theme.border}`,
                  }}
                >
                  {cols.map((col, cIdx) => (
                    <td
                      key={col.key}
                      style={{
                        color: theme.text,
                        fontWeight: col.key === 'language' ? 600 : 400,
                        borderRight:
                          cIdx < cols.length - 1
                            ? `1px solid ${theme.border}`
                            : 'none',
                        verticalAlign: 'middle',
                      }}
                    >
                      {String(r.row[col.key] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
        continue;
      }

      if (b.kind === 'references_grid') {
        elements.push(
          <div
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            className="cv-keep-together"
            style={{ marginBottom: '5px' }}
          >
            {b.items.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    b.items.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                {b.items.map((refItem) => (
                  <div
                    key={refItem.id}
                    style={{
                      border: `1px solid ${theme.border}`,
                      padding: '7px 9px',
                      backgroundColor: theme.stripeBg,
                      fontSize: `${baseFontSizePx * 0.91}px`,
                      lineHeight: 1.42,
                    }}
                  >
                    {refItem.name.trim() && (
                      <div style={{ fontWeight: 700, color: theme.heading }}>
                        {refItem.name.trim()}
                      </div>
                    )}
                    {refItem.designation.trim() && (
                      <div style={{ color: theme.accent, fontWeight: 600 }}>
                        {refItem.designation.trim()}
                      </div>
                    )}
                    {refItem.organization.trim() && (
                      <div style={{ color: theme.text }}>
                        {refItem.organization.trim()}
                      </div>
                    )}
                    {refItem.phone.trim() && (
                      <div style={{ color: theme.muted, marginTop: '2px' }}>
                        Phone: {refItem.phone.trim()}
                      </div>
                    )}
                    {refItem.email.trim() && (
                      <div style={{ color: theme.muted }}>
                        Email: {refItem.email.trim()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {b.customNotes.length > 0 && (
              <div
                style={{
                  marginTop: b.items.length > 0 ? '6px' : 0,
                  fontSize: `${baseFontSizePx * 0.91}px`,
                  color: theme.text,
                }}
              >
                {b.customNotes.map((n) => (
                  <div key={n.id}>
                    <strong>{n.label}:</strong> {n.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'enclosures_list') {
        elements.push(
          <ul
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            className="cv-keep-together"
            style={{
              margin: '0 0 6px 0',
              paddingLeft: 0,
              listStyle: 'none',
              fontSize: `${baseFontSizePx * 0.94}px`,
              lineHeight: 1.48,
              color: theme.text,
            }}
          >
            {b.items.map((lbl, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '7px',
                  marginBottom: '2px',
                }}
              >
                <span style={{ color: theme.accent, fontWeight: 700 }}>•</span>
                <span>{lbl}</span>
              </li>
            ))}
          </ul>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'declaration_block') {
        const decl = cv.declaration;
        const showStatement =
          decl.statementEnabled !== false && Boolean(decl.statement.trim());
        const showSignature = decl.signatureEnabled !== false;
        const applicantName = (
          decl.applicantNameOverride.trim() ||
          (cv.header.fullNameEn.enabled ? cv.header.fullNameEn.value.trim() : '')
        ).toUpperCase();
        const showDate = decl.date.enabled && Boolean(decl.date.value.trim());
        const hasSigImage =
          decl.signatureMode === 'image' && Boolean(decl.signatureImageUrl);
        const hasTypedSig =
          decl.signatureMode === 'typed' && Boolean(decl.typedSignature.trim());

        elements.push(
          <div
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            className="cv-keep-together"
            style={{ marginBottom: '4px' }}
          >
            {showStatement && (
              <p
                style={{
                  margin: showDate || showSignature ? '0 0 18px 0' : 0,
                  fontSize: `${baseFontSizePx * 0.95}px`,
                  lineHeight: 1.48,
                  color: theme.text,
                  textAlign: 'justify',
                }}
              >
                {decl.statement.trim()}
              </p>
            )}

            {(showDate || showSignature) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '24px',
                  paddingTop: '6px',
                }}
              >
                {/* Left: Date */}
                <div
                  style={{
                    minWidth: '160px',
                    fontSize: `${baseFontSizePx * 0.94}px`,
                    color: theme.text,
                    paddingBottom: showSignature && applicantName ? '16px' : '0px',
                  }}
                >
                  {showDate && (
                    <div>
                      <strong style={{ color: theme.heading }}>Date:</strong>{' '}
                      <span>{decl.date.value.trim()}</span>
                    </div>
                  )}
                </div>

                {/* Right: Signature Image/Text ABOVE horizontal line, labels BELOW */}
                {showSignature && (
                  <div
                    style={{
                      minWidth: '210px',
                      textAlign: 'center',
                    }}
                  >
                    {/* Signature area strictly ABOVE line */}
                    <div
                      style={{
                        minHeight: '38px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingBottom: '4px',
                      }}
                    >
                      {hasSigImage && (
                        <img
                          src={decl.signatureImageUrl}
                          alt="Applicant Signature"
                          referrerPolicy="no-referrer"
                          style={{
                            maxHeight: '36px',
                            maxWidth: '185px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      )}
                      {!hasSigImage && hasTypedSig && (
                        <span
                          className="cv-typed-signature"
                          style={{
                            fontSize: `${baseFontSizePx * 1.55}px`,
                            lineHeight: 1.1,
                            color: theme.heading,
                          }}
                        >
                          {decl.typedSignature.trim()}
                        </span>
                      )}
                    </div>

                    {/* Horizontal Signature Line */}
                    <div
                      style={{
                        borderTop: `1px solid ${theme.heading}`,
                        paddingTop: '5px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: `${baseFontSizePx * 0.88}px`,
                          fontWeight: 600,
                          color: theme.text,
                          lineHeight: 1.3,
                        }}
                      >
                        Signature of Applicant
                      </div>
                      {applicantName && (
                        <div
                          style={{
                            marginTop: '3px',
                            fontSize: `${baseFontSizePx * 0.88}px`,
                            fontWeight: 700,
                            color: theme.heading,
                            letterSpacing: '0.03em',
                            lineHeight: 1.3,
                          }}
                        >
                          {applicantName}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'custom_bullets') {
        elements.push(
          <ul
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            className="cv-keep-together"
            style={{
              margin: '0 0 6px 0',
              paddingLeft: 0,
              listStyle: 'none',
              fontSize: `${baseFontSizePx * 0.94}px`,
              lineHeight: 1.46,
              color: theme.text,
            }}
          >
            {b.items.map((it) => (
              <li
                key={it.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '7px',
                  marginBottom: '2.5px',
                }}
              >
                <span style={{ color: theme.accent, fontWeight: 700 }}>•</span>
                <span>
                  {it.label && (
                    <strong style={{ color: theme.heading }}>{it.label}: </strong>
                  )}
                  {it.value}
                </span>
              </li>
            ))}
          </ul>
        );
        i += 1;
        continue;
      }

      if (b.kind === 'custom_grid') {
        elements.push(
          <div
            key={b.id}
            data-block-id={isMeasurement ? b.id : undefined}
            className="cv-keep-together"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '6px 12px',
              marginBottom: '6px',
              fontSize: `${baseFontSizePx * 0.92}px`,
              lineHeight: 1.4,
            }}
          >
            {b.items.map((it) => (
              <div
                key={it.id}
                style={{
                  border: `1px solid ${theme.border}`,
                  padding: '5px 8px',
                  backgroundColor: theme.stripeBg,
                }}
              >
                {it.label && (
                  <div style={{ fontWeight: 700, color: theme.heading }}>
                    {it.label}
                  </div>
                )}
                {it.value && <div style={{ color: theme.text }}>{it.value}</div>}
              </div>
            ))}
          </div>
        );
        i += 1;
        continue;
      }

      i += 1;
    }

    return elements;
  };

  const totalAllPages = pages.length + attachmentSheets.length;

  return (
    <>
      {/* Hidden A4 calibration box for exact mm-to-px ratio */}
      <div
        ref={calibrationRef}
        aria-hidden="true"
        className="no-print"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '210mm',
          height: '297mm',
          pointerEvents: 'none',
          visibility: 'hidden',
        }}
      />

      {/* Offscreen Measurement Stage matching exact printable width */}
      <div
        ref={measureStageRef}
        aria-hidden="true"
        className={`no-print ${fontClass}`}
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: `${210 - margin.leftMm - margin.rightMm}mm`,
          fontSize: `${baseFontSizePx}px`,
          pointerEvents: 'none',
          visibility: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {renderPageContent(blocks, true)}
      </div>

      {/* Rendered A4 Sheets Stack */}
      {pages.map((pageBlocks, pageIdx) => {
        const pageNum = pageIdx + 1;
        return (
          <div
            key={`cv-page-${pageNum}`}
            ref={(el) => {
              if (sheetRefs) sheetRefs.current[pageIdx] = el;
            }}
            className={`a4-sheet ${fontClass}`}
            style={{
              paddingTop: `${margin.topMm}mm`,
              paddingBottom: `${footerZoneMm}mm`,
              paddingLeft: `${margin.leftMm}mm`,
              paddingRight: `${margin.rightMm}mm`,
              fontSize: `${baseFontSizePx}px`,
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <div
              ref={(el) => {
                bodyRefs.current[pageIdx] = el;
              }}
              className="a4-sheet-body"
              style={{
                height: `${contentBoxHeightMm}mm`,
                maxHeight: `${contentBoxHeightMm}mm`,
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              {renderPageContent(pageBlocks, false)}
            </div>

            {totalAllPages > 1 && (
              <footer
                className="a4-sheet-footer"
                style={{
                  position: 'absolute',
                  bottom: '8mm',
                  left: `${margin.leftMm}mm`,
                  right: `${margin.rightMm}mm`,
                  borderTop: `1px solid ${theme.border}`,
                  paddingTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '8.5px',
                  lineHeight: 1.2,
                  color: theme.muted,
                  backgroundColor: '#ffffff',
                }}
              >
                <span>
                  {cv.header.fullNameEn.enabled && cv.header.fullNameEn.value.trim()
                    ? cv.header.fullNameEn.value.trim()
                    : 'Curriculum Vitae & Bio-Data'}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  Page {pageNum} of {totalAllPages}
                </span>
              </footer>
            )}
          </div>
        );
      })}

      {/* Rendered Supporting Evidence & Attachment Sheets */}
      {attachmentSheets.map((attSheet, aIdx) => {
        const globalIdx = pages.length + aIdx;
        const pageNum = globalIdx + 1;
        return (
          <div
            key={attSheet.id}
            ref={(el) => {
              if (sheetRefs) sheetRefs.current[globalIdx] = el;
            }}
            className={`a4-sheet ${fontClass}`}
            style={{
              paddingTop: `${margin.topMm}mm`,
              paddingBottom: `${footerZoneMm}mm`,
              paddingLeft: `${margin.leftMm}mm`,
              paddingRight: `${margin.rightMm}mm`,
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="a4-sheet-body"
              style={{
                height: `${contentBoxHeightMm}mm`,
                maxHeight: `${contentBoxHeightMm}mm`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: attSheet.mode === 'two-up' ? '8mm' : '4mm',
                boxSizing: 'border-box',
              }}
            >
              {attSheet.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    flex: attSheet.mode === 'two-up' ? '0 0 calc(50% - 4mm)' : 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: '#ffffff',
                    padding: '6px',
                    boxSizing: 'border-box',
                  }}
                >
                  {item.title.trim() && (
                    <div
                      style={{
                        borderBottom: `1px solid ${theme.border}`,
                        paddingBottom: '4px',
                        marginBottom: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: theme.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{item.title.trim()}</span>
                      {item.pageLabel && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 500,
                            color: theme.muted,
                          }}
                        >
                          {item.pageLabel}
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={item.dataUrl}
                      alt={item.title || 'Supporting Attachment'}
                      referrerPolicy="no-referrer"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <footer
              className="a4-sheet-footer"
              style={{
                position: 'absolute',
                bottom: '8mm',
                left: `${margin.leftMm}mm`,
                right: `${margin.rightMm}mm`,
                borderTop: `1px solid ${theme.border}`,
                paddingTop: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '8.5px',
                lineHeight: 1.2,
                color: theme.muted,
                backgroundColor: '#ffffff',
              }}
            >
              <span>Supporting Evidence & Enclosures</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                Page {pageNum} of {totalAllPages}
              </span>
            </footer>
          </div>
        );
      })}
    </>
  );
};
