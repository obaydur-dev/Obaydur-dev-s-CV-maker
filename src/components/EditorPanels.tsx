import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eraser,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { SECTOR_CONFIGS } from '../data/presets';
import {
  AcademicColumnsConfig,
  AcademicRow,
  AddressBlock,
  BuiltInSectionId,
  CVDocumentState,
  CustomSection,
  EnclosureItem,
  LanguageRow,
  ProjectCardItem,
  ReferenceItem,
} from '../types/cv';
import {
  calculateAgeFromDob,
  cleanSignatureBackground,
  readHighResImageFile,
  uid,
} from '../utils/imageAndPdf';
import { CustomFieldsList, CustomSectionsEditor } from './CustomSectionsPanel';
import { PhotoStudio } from './PhotoStudio';
import { FieldToggleRow, SectionAccordion, ToggleCheck } from './ToggleSwitch';

interface EditorPanelsProps {
  cv: CVDocumentState;
  onChange: (updater: (prev: CVDocumentState) => CVDocumentState) => void;
  onNotify?: (msg: string) => void;
}

const inputCls =
  'w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors';

const textareaCls =
  'w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors resize-y leading-relaxed';

export const EditorPanels: React.FC<EditorPanelsProps> = ({
  cv,
  onChange,
  onNotify,
}) => {
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    panelA: true,
    objective: true,
    skills: false,
    experience: false,
    readiness: false,
    academic: false,
    languages: false,
    biodata: false,
    addresses: false,
    references: false,
    enclosures: false,
    declaration: false,
  });

  const sigInputRef = useRef<HTMLInputElement>(null);

  const toggleOpen = (key: string) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = { panelA: true };
    cv.sectionOrder.forEach((k) => {
      next[k] = true;
    });
    setOpenPanels(next);
  };

  const collapseAll = () => {
    setOpenPanels({ panelA: false });
  };

  const moveSection = (sectionKey: string, dir: -1 | 1) => {
    onChange((prev) => {
      const idx = prev.sectionOrder.indexOf(sectionKey);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.sectionOrder.length) {
        return prev;
      }
      const nextOrder = [...prev.sectionOrder];
      const [item] = nextOrder.splice(idx, 1);
      nextOrder.splice(target, 0, item);
      return { ...prev, sectionOrder: nextOrder };
    });
  };

  const handleAddCustomSection = (layout: CustomSection['layout']) => {
    const id = uid('sec');
    const newSec: CustomSection = {
      id,
      enabled: true,
      title: 'Training & Certifications',
      layout,
      items: [
        {
          id: uid('cf'),
          enabled: true,
          label: 'Certificate Title',
          value: 'Details / Issuing Authority',
        },
      ],
    };
    onChange((prev) => ({
      ...prev,
      customSections: [...prev.customSections, newSec],
      sectionOrder: [...prev.sectionOrder, `custom_${id}`],
    }));
    onNotify?.('Added new custom section');
  };

  const handleDeleteCustomSection = (secId: string) => {
    onChange((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((s) => s.id !== secId),
      sectionOrder: prev.sectionOrder.filter((k) => k !== `custom_${secId}`),
    }));
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await readHighResImageFile(file, 1400);
      onChange((prev) => ({
        ...prev,
        declaration: {
          ...prev.declaration,
          signatureMode: 'image',
          signatureImageUrl: dataUrl,
        },
      }));
      onNotify?.('Signature image uploaded');
    } catch {
      onNotify?.('Could not load signature image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleCleanSignatureBg = async () => {
    if (!cv.declaration.signatureImageUrl) return;
    try {
      const cleaned = await cleanSignatureBackground(cv.declaration.signatureImageUrl);
      onChange((prev) => ({
        ...prev,
        declaration: { ...prev.declaration, signatureImageUrl: cleaned },
      }));
      onNotify?.('Removed light paper background from signature');
    } catch {
      onNotify?.('Failed to clean signature background.');
    }
  };

  const builtInIds = cv.sectionOrder.filter(
    (k): k is BuiltInSectionId => !k.startsWith('custom_')
  );

  const renderBuiltInPanel = (id: BuiltInSectionId, orderIndex: number) => {
    const canMoveUp = orderIndex > 0;
    const canMoveDown = orderIndex < cv.sectionOrder.length - 1;
    const code = `P-${String(orderIndex + 2).padStart(2, '0')}`;

    switch (id) {
      case 'objective':
        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Career Objective & Executive Summary"
            subtitle="Panel B · Sector-adaptable executive statement"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.objective.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({ ...p, objective: { ...p.objective, enabled } }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            {cv.objective.enabled && (
              <>
                <div className="flex items-center justify-between gap-2 pb-1">
                  <span className="text-[11px] text-slate-500">
                    Active Mode: {SECTOR_CONFIGS[cv.sector].shortLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange((p) => ({
                        ...p,
                        objective: {
                          enabled: true,
                          value: SECTOR_CONFIGS[p.sector].objective,
                        },
                      }));
                      onNotify?.(
                        `Career objective adapted for ${SECTOR_CONFIGS[cv.sector].shortLabel}`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3 h-3" />
                    Adapt for Selected Sector
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={cv.objective.value}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      objective: { ...p.objective, value: e.target.value },
                    }))
                  }
                  placeholder="Write your tailored career objective or executive summary..."
                  className={textareaCls}
                />
              </>
            )}
          </SectionAccordion>
        );

      case 'skills':
        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Core Skills & Verified Capabilities"
            subtitle="Panel C · Separate toggleable skill categories"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.skills.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({ ...p, skills: { ...p.skills, enabled } }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            <FieldToggleRow
              label="Typing Speed (Bangla WPM & English WPM)"
              checked={cv.skills.typingSpeedEnabled}
              onToggle={(typingSpeedEnabled) =>
                onChange((p) => ({
                  ...p,
                  skills: { ...p.skills, typingSpeedEnabled },
                }))
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Bangla Typing Speed
                  </label>
                  <input
                    type="text"
                    value={cv.skills.banglaWpm}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        skills: { ...p.skills, banglaWpm: e.target.value },
                      }))
                    }
                    placeholder="e.g., 38 WPM (Bijoy & Avro Unicode)"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    English Typing Speed
                  </label>
                  <input
                    type="text"
                    value={cv.skills.englishWpm}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        skills: { ...p.skills, englishWpm: e.target.value },
                      }))
                    }
                    placeholder="e.g., 58 WPM (98% Verified Accuracy)"
                    className={inputCls}
                  />
                </div>
              </div>
            </FieldToggleRow>

            {(
              [
                ['officeTools', 'Office & Data Management Tools'],
                ['webTechTools', 'Web, Technical & Digital Tools'],
                ['designTools', 'Design & Visual Presentation Tools'],
                ['aiWorkflow', 'AI & Modern Workflow Efficiency'],
                ['coordinationOps', 'Coordination & Operational Strengths'],
                ['workEthicSoft', 'Core Work Ethic & Soft Skills'],
              ] as const
            ).map(([fieldKey, label]) => (
              <FieldToggleRow
                key={fieldKey}
                label={label}
                checked={cv.skills[fieldKey].enabled}
                onToggle={(enabled) =>
                  onChange((p) => ({
                    ...p,
                    skills: {
                      ...p.skills,
                      [fieldKey]: { ...p.skills[fieldKey], enabled },
                    },
                  }))
                }
              >
                <textarea
                  rows={2}
                  value={cv.skills[fieldKey].value}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      skills: {
                        ...p.skills,
                        [fieldKey]: { ...p.skills[fieldKey], value: e.target.value },
                      },
                    }))
                  }
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  className={textareaCls}
                />
              </FieldToggleRow>
            ))}

            <CustomFieldsList
              items={cv.skills.customFields}
              onChange={(customFields) =>
                onChange((p) => ({ ...p, skills: { ...p.skills, customFields } }))
              }
              addButtonLabel="+ Add Custom Skill Row"
              labelPlaceholder="Skill Category (e.g., Accounting Software)"
              valuePlaceholder="Details (e.g., TallyPrime, QuickBooks)"
            />
          </SectionAccordion>
        );

      case 'experience': {
        const addProject = () => {
          const item: ProjectCardItem = {
            id: uid('proj'),
            enabled: true,
            title: '',
            badge: '',
            organization: '',
            duration: '',
            bullets: [''],
          };
          onChange((p) => ({
            ...p,
            experience: { ...p.experience, items: [...p.experience.items, item] },
          }));
        };

        const updateProject = (pid: string, patch: Partial<ProjectCardItem>) => {
          onChange((p) => ({
            ...p,
            experience: {
              ...p.experience,
              items: p.experience.items.map((it) =>
                it.id === pid ? { ...it, ...patch } : it
              ),
            },
          }));
        };

        const moveProject = (index: number, dir: -1 | 1) => {
          onChange((p) => {
            const target = index + dir;
            if (target < 0 || target >= p.experience.items.length) return p;
            const copy = [...p.experience.items];
            const [item] = copy.splice(index, 1);
            copy.splice(target, 0, item);
            return { ...p, experience: { ...p.experience, items: copy } };
          });
        };

        const removeProject = (pid: string) => {
          onChange((p) => ({
            ...p,
            experience: {
              ...p.experience,
              items: p.experience.items.filter((it) => it.id !== pid),
            },
          }));
        };

        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Practical Experience, Projects & Responsibilities"
            subtitle="Panel D · Repeatable, reorderable role & project cards"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.experience.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({
                ...p,
                experience: { ...p.experience, enabled },
              }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            {cv.experience.items.map((proj, idx) => (
              <div
                key={proj.id}
                className={`rounded-md border p-3 space-y-2.5 ${
                  proj.enabled
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-200/70 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <ToggleCheck
                    checked={proj.enabled}
                    onChange={(enabled) => updateProject(proj.id, { enabled })}
                    label={proj.title.trim() || `Experience / Project #${idx + 1}`}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveProject(idx, -1)}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === cv.experience.items.length - 1}
                      onClick={() => moveProject(idx, 1)}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProject(proj.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete project card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {proj.enabled && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={proj.title}
                        onChange={(e) =>
                          updateProject(proj.id, { title: e.target.value })
                        }
                        placeholder="Project / Role Title"
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={proj.badge}
                        onChange={(e) =>
                          updateProject(proj.id, { badge: e.target.value })
                        }
                        placeholder="Tag / Category (e.g., Deployed Web Project)"
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={proj.organization}
                        onChange={(e) =>
                          updateProject(proj.id, { organization: e.target.value })
                        }
                        placeholder="Organization / Context"
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={proj.duration}
                        onChange={(e) =>
                          updateProject(proj.id, { duration: e.target.value })
                        }
                        placeholder="Duration / Status (e.g., Jan 2024 – Present)"
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="block text-[11px] font-medium text-slate-500">
                        Key Responsibilities & Outcomes
                      </span>
                      {proj.bullets.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-1.5">
                          <span className="text-slate-400 text-xs mt-1.5">•</span>
                          <input
                            type="text"
                            value={b}
                            onChange={(e) => {
                              const nextBullets = [...proj.bullets];
                              nextBullets[bIdx] = e.target.value;
                              updateProject(proj.id, { bullets: nextBullets });
                            }}
                            placeholder="Describe measurable responsibility or achievement..."
                            className={inputCls}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextBullets = proj.bullets.filter(
                                (_, i) => i !== bIdx
                              );
                              updateProject(proj.id, { bullets: nextBullets });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded shrink-0"
                            title="Remove bullet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateProject(proj.id, {
                            bullets: [...proj.bullets, ''],
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 pt-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Bullet Point
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Experience / Project Card
            </button>
          </SectionAccordion>
        );
      }

      case 'readiness':
        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Work Readiness, Logistics & Background Assurance"
            subtitle="Panel E · One attribute per row"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.readiness.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({
                ...p,
                readiness: { ...p.readiness, enabled },
              }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            {(
              [
                ['preferredSectors', 'Preferred Sectors / Roles'],
                ['employmentType', 'Employment Type (Full-time / Part-time / Contractual)'],
                ['workMode', 'Work Mode (On-site / Remote / Hybrid)'],
                ['shiftFlexibility', 'Shift & Schedule Flexibility'],
                ['joiningAvailability', 'Joining Availability'],
                ['relocationTravel', 'Relocation & Travel Willingness'],
                ['workstationInternet', 'Workstation & Internet Readiness'],
                ['expectedSalary', 'Expected Compensation / Salary'],
                ['legalConductRecord', 'Legal & Conduct Record (Clean Background Assurance)'],
              ] as const
            ).map(([fieldKey, label]) => (
              <FieldToggleRow
                key={fieldKey}
                label={label}
                checked={cv.readiness[fieldKey].enabled}
                onToggle={(enabled) =>
                  onChange((p) => ({
                    ...p,
                    readiness: {
                      ...p.readiness,
                      [fieldKey]: { ...p.readiness[fieldKey], enabled },
                    },
                  }))
                }
              >
                <input
                  type="text"
                  value={cv.readiness[fieldKey].value}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      readiness: {
                        ...p.readiness,
                        [fieldKey]: {
                          ...p.readiness[fieldKey],
                          value: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  className={inputCls}
                />
              </FieldToggleRow>
            ))}

            <CustomFieldsList
              items={cv.readiness.customFields}
              onChange={(customFields) =>
                onChange((p) => ({
                  ...p,
                  readiness: { ...p.readiness, customFields },
                }))
              }
              addButtonLabel="+ Add Custom Readiness Row"
              labelPlaceholder="Readiness Attribute"
              valuePlaceholder="Status / Details"
            />
          </SectionAccordion>
        );

      case 'academic': {
        const colDefs: { key: keyof AcademicColumnsConfig; label: string }[] = [
          { key: 'examTitle', label: 'Exam Title' },
          { key: 'group', label: 'Group / Discipline' },
          { key: 'majorSubjects', label: 'Major Subjects' },
          { key: 'institution', label: 'Institution' },
          { key: 'board', label: 'Board / Univ.' },
          { key: 'rollNo', label: 'Roll No.' },
          { key: 'regNo', label: 'Reg. No.' },
          { key: 'passingYear', label: 'Passing Year' },
          { key: 'result', label: 'Result (GPA/CGPA)' },
        ];

        const addRow = () => {
          const newRow: AcademicRow = {
            id: uid('edu'),
            enabled: true,
            examTitle: '',
            group: '',
            majorSubjects: '',
            institution: '',
            board: '',
            rollNo: '',
            regNo: '',
            passingYear: '',
            result: '',
          };
          onChange((p) => ({
            ...p,
            academic: { ...p.academic, rows: [...p.academic.rows, newRow] },
          }));
        };

        const updateRow = (rid: string, patch: Partial<AcademicRow>) => {
          onChange((p) => ({
            ...p,
            academic: {
              ...p.academic,
              rows: p.academic.rows.map((r) =>
                r.id === rid ? { ...r, ...patch } : r
              ),
            },
          }));
        };

        const moveRow = (index: number, dir: -1 | 1) => {
          onChange((p) => {
            const target = index + dir;
            if (target < 0 || target >= p.academic.rows.length) return p;
            const copy = [...p.academic.rows];
            const [item] = copy.splice(index, 1);
            copy.splice(target, 0, item);
            return { ...p, academic: { ...p.academic, rows: copy } };
          });
        };

        const removeRow = (rid: string) => {
          onChange((p) => ({
            ...p,
            academic: {
              ...p.academic,
              rows: p.academic.rows.filter((r) => r.id !== rid),
            },
          }));
        };

        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Academic Qualification"
            subtitle="Panel F · Toggleable global columns & repeatable rows"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.academic.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({ ...p, academic: { ...p.academic, enabled } }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            {/* Global Column Toggles */}
            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="text-[11px] font-semibold text-slate-700 mb-2">
                Visible Table Columns (Global Toggles)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {colDefs.map((col) => (
                  <ToggleCheck
                    key={col.key}
                    checked={cv.academic.columns[col.key]}
                    onChange={(val) =>
                      onChange((p) => ({
                        ...p,
                        academic: {
                          ...p.academic,
                          columns: { ...p.academic.columns, [col.key]: val },
                        },
                      }))
                    }
                    label={col.label}
                  />
                ))}
              </div>
            </div>

            {cv.academic.rows.map((row, idx) => (
              <div
                key={row.id}
                className={`rounded-md border p-3 space-y-2 ${
                  row.enabled
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-200/70 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <ToggleCheck
                    checked={row.enabled}
                    onChange={(enabled) => updateRow(row.id, { enabled })}
                    label={row.examTitle.trim() || `Qualification #${idx + 1}`}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveRow(idx, -1)}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === cv.academic.rows.length - 1}
                      onClick={() => moveRow(idx, 1)}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete qualification row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {row.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cv.academic.columns.examTitle && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Exam Title
                        </label>
                        <input
                          type="text"
                          value={row.examTitle}
                          onChange={(e) =>
                            updateRow(row.id, { examTitle: e.target.value })
                          }
                          placeholder="e.g., B.Sc. / H.S.C. / S.S.C."
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.group && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Group / Discipline
                        </label>
                        <input
                          type="text"
                          value={row.group}
                          onChange={(e) =>
                            updateRow(row.id, { group: e.target.value })
                          }
                          placeholder="e.g., Science / CSE"
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.majorSubjects && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Major Subjects
                        </label>
                        <input
                          type="text"
                          value={row.majorSubjects}
                          onChange={(e) =>
                            updateRow(row.id, { majorSubjects: e.target.value })
                          }
                          placeholder="Major Subjects Studied"
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.institution && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Institution Name
                        </label>
                        <input
                          type="text"
                          value={row.institution}
                          onChange={(e) =>
                            updateRow(row.id, { institution: e.target.value })
                          }
                          placeholder="School / College / University"
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.board && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Board / University
                        </label>
                        <input
                          type="text"
                          value={row.board}
                          onChange={(e) =>
                            updateRow(row.id, { board: e.target.value })
                          }
                          placeholder="e.g., Dhaka Board / UGC"
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.rollNo && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Roll No.
                        </label>
                        <input
                          type="text"
                          value={row.rollNo}
                          onChange={(e) =>
                            updateRow(row.id, { rollNo: e.target.value })
                          }
                          placeholder="Enter Exam Roll No."
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.regNo && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Reg. No.
                        </label>
                        <input
                          type="text"
                          value={row.regNo}
                          onChange={(e) =>
                            updateRow(row.id, { regNo: e.target.value })
                          }
                          placeholder="Enter Registration No."
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.passingYear && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Passing Year
                        </label>
                        <input
                          type="text"
                          value={row.passingYear}
                          onChange={(e) =>
                            updateRow(row.id, { passingYear: e.target.value })
                          }
                          placeholder="e.g., 2023"
                          className={inputCls}
                        />
                      </div>
                    )}
                    {cv.academic.columns.result && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Result (GPA / CGPA)
                        </label>
                        <input
                          type="text"
                          value={row.result}
                          onChange={(e) =>
                            updateRow(row.id, { result: e.target.value })
                          }
                          placeholder="e.g., CGPA 3.68 / 4.00"
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Academic Row
            </button>
          </SectionAccordion>
        );
      }

      case 'languages': {
        const addLang = () => {
          const row: LanguageRow = {
            id: uid('lang'),
            enabled: true,
            language: '',
            reading: 'Fluent',
            writing: 'Fluent',
            speaking: 'Fluent',
            listening: 'Fluent',
            typing: '',
          };
          onChange((p) => ({
            ...p,
            languages: { ...p.languages, rows: [...p.languages.rows, row] },
          }));
        };

        const updateLang = (lid: string, patch: Partial<LanguageRow>) => {
          onChange((p) => ({
            ...p,
            languages: {
              ...p.languages,
              rows: p.languages.rows.map((r) =>
                r.id === lid ? { ...r, ...patch } : r
              ),
            },
          }));
        };

        const removeLang = (lid: string) => {
          onChange((p) => ({
            ...p,
            languages: {
              ...p.languages,
              rows: p.languages.rows.filter((r) => r.id !== lid),
            },
          }));
        };

        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Language Proficiency Matrix"
            subtitle="Panel G · Reading, Writing, Speaking, Listening & Typing"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.languages.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({
                ...p,
                languages: { ...p.languages, enabled },
              }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            {cv.languages.rows.map((row, idx) => (
              <div
                key={row.id}
                className={`rounded-md border p-3 space-y-2 ${
                  row.enabled
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-200/70 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <ToggleCheck
                    checked={row.enabled}
                    onChange={(enabled) => updateLang(row.id, { enabled })}
                    label={row.language.trim() || `Language #${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeLang(row.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Delete language"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {row.enabled && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={row.language}
                      onChange={(e) =>
                        updateLang(row.id, { language: e.target.value })
                      }
                      placeholder="Language (e.g., Bengali)"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={row.reading}
                      onChange={(e) =>
                        updateLang(row.id, { reading: e.target.value })
                      }
                      placeholder="Reading"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={row.writing}
                      onChange={(e) =>
                        updateLang(row.id, { writing: e.target.value })
                      }
                      placeholder="Writing"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={row.speaking}
                      onChange={(e) =>
                        updateLang(row.id, { speaking: e.target.value })
                      }
                      placeholder="Speaking"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={row.listening}
                      onChange={(e) =>
                        updateLang(row.id, { listening: e.target.value })
                      }
                      placeholder="Listening"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={row.typing}
                      onChange={(e) =>
                        updateLang(row.id, { typing: e.target.value })
                      }
                      placeholder="Typing (e.g., 58 WPM)"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addLang}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Language Row
            </button>
          </SectionAccordion>
        );
      }

      case 'biodata': {
        const autoAge = calculateAgeFromDob(cv.biodata.dateOfBirth.value);
        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Complete Personal & Official Bio-Data"
            subtitle="Panel H · Strictly one attribute per row"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.biodata.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({ ...p, biodata: { ...p.biodata, enabled } }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            {/* Father's Name (English & Bangla) */}
            <FieldToggleRow
              label="Father's Name (English & Bangla)"
              checked={cv.biodata.fatherName.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  biodata: {
                    ...p.biodata,
                    fatherName: { ...p.biodata.fatherName, enabled },
                  },
                }))
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={cv.biodata.fatherName.en}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      biodata: {
                        ...p.biodata,
                        fatherName: { ...p.biodata.fatherName, en: e.target.value },
                      },
                    }))
                  }
                  placeholder="Father's Name (English)"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={cv.biodata.fatherName.bn}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      biodata: {
                        ...p.biodata,
                        fatherName: { ...p.biodata.fatherName, bn: e.target.value },
                      },
                    }))
                  }
                  placeholder="পিতার নাম (বাংলায় - ঐচ্ছিক)"
                  className={inputCls}
                />
              </div>
            </FieldToggleRow>

            <FieldToggleRow
              label="Father's Occupation"
              checked={cv.biodata.fatherOccupation.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  biodata: {
                    ...p.biodata,
                    fatherOccupation: { ...p.biodata.fatherOccupation, enabled },
                  },
                }))
              }
            >
              <input
                type="text"
                value={cv.biodata.fatherOccupation.value}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    biodata: {
                      ...p.biodata,
                      fatherOccupation: {
                        ...p.biodata.fatherOccupation,
                        value: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="Father's Occupation"
                className={inputCls}
              />
            </FieldToggleRow>

            {/* Mother's Name (English & Bangla) */}
            <FieldToggleRow
              label="Mother's Name (English & Bangla)"
              checked={cv.biodata.motherName.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  biodata: {
                    ...p.biodata,
                    motherName: { ...p.biodata.motherName, enabled },
                  },
                }))
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={cv.biodata.motherName.en}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      biodata: {
                        ...p.biodata,
                        motherName: { ...p.biodata.motherName, en: e.target.value },
                      },
                    }))
                  }
                  placeholder="Mother's Name (English)"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={cv.biodata.motherName.bn}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      biodata: {
                        ...p.biodata,
                        motherName: { ...p.biodata.motherName, bn: e.target.value },
                      },
                    }))
                  }
                  placeholder="মাতার নাম (বাংলায় - ঐচ্ছিক)"
                  className={inputCls}
                />
              </div>
            </FieldToggleRow>

            <FieldToggleRow
              label="Mother's Occupation"
              checked={cv.biodata.motherOccupation.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  biodata: {
                    ...p.biodata,
                    motherOccupation: { ...p.biodata.motherOccupation, enabled },
                  },
                }))
              }
            >
              <input
                type="text"
                value={cv.biodata.motherOccupation.value}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    biodata: {
                      ...p.biodata,
                      motherOccupation: {
                        ...p.biodata.motherOccupation,
                        value: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="Mother's Occupation"
                className={inputCls}
              />
            </FieldToggleRow>

            {/* Date of Birth */}
            <FieldToggleRow
              label="Date of Birth"
              checked={cv.biodata.dateOfBirth.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  biodata: {
                    ...p.biodata,
                    dateOfBirth: { ...p.biodata.dateOfBirth, enabled },
                  },
                }))
              }
            >
              <input
                type="date"
                value={cv.biodata.dateOfBirth.value}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    biodata: {
                      ...p.biodata,
                      dateOfBirth: {
                        ...p.biodata.dateOfBirth,
                        value: e.target.value,
                      },
                    },
                  }))
                }
                className={inputCls}
              />
            </FieldToggleRow>

            {/* Age */}
            <FieldToggleRow
              label="Age"
              checked={cv.biodata.age.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  biodata: {
                    ...p.biodata,
                    age: { ...p.biodata.age, enabled },
                  },
                }))
              }
              rightAction={
                cv.biodata.age.enabled ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        biodata: {
                          ...p.biodata,
                          age: {
                            ...p.biodata.age,
                            autoCalculate: !p.biodata.age.autoCalculate,
                          },
                        },
                      }))
                    }
                    className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors ${
                      cv.biodata.age.autoCalculate
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {cv.biodata.age.autoCalculate ? 'Auto from DOB' : 'Manual'}
                  </button>
                ) : null
              }
            >
              {cv.biodata.age.autoCalculate ? (
                <div className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 font-mono-tabular">
                  {autoAge || 'Set Date of Birth above to auto-calculate age'}
                </div>
              ) : (
                <input
                  type="text"
                  value={cv.biodata.age.manualValue}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      biodata: {
                        ...p.biodata,
                        age: { ...p.biodata.age, manualValue: e.target.value },
                      },
                    }))
                  }
                  placeholder="e.g., 25 Years"
                  className={inputCls}
                />
              )}
            </FieldToggleRow>

            {(
              [
                ['nidNumber', 'National ID (NID) Number', 'e.g., 554 892 1047'],
                ['birthRegNumber', 'Birth Registration Number', 'e.g., 20012610948012345'],
                ['passportNumber', 'Passport Number', 'e.g., A04892134'],
                ['drivingLicense', 'Driving License Number', 'e.g., DK-0492817L0002'],
                ['nationality', 'Nationality', 'e.g., Bangladeshi (by Birth)'],
                ['religion', 'Religion', 'e.g., Islam'],
                ['gender', 'Gender', 'e.g., Male / Female'],
                ['maritalStatus', 'Marital Status', 'e.g., Unmarried / Married'],
                ['bloodGroup', 'Blood Group', 'e.g., O+ (Positive)'],
                ['height', 'Height', 'e.g., 5 ft 8 in (173 cm)'],
                [
                  'emergencyContactPerson',
                  'Emergency Contact Person & Relation',
                  'e.g., Md. Shafiqul Islam (Father)',
                ],
                [
                  'emergencyContactMobile',
                  'Emergency Contact Mobile Number',
                  'e.g., +880 1711-339204',
                ],
              ] as const
            ).map(([fieldKey, label, ph]) => (
              <FieldToggleRow
                key={fieldKey}
                label={label}
                checked={cv.biodata[fieldKey].enabled}
                onToggle={(enabled) =>
                  onChange((p) => ({
                    ...p,
                    biodata: {
                      ...p.biodata,
                      [fieldKey]: { ...p.biodata[fieldKey], enabled },
                    },
                  }))
                }
              >
                <input
                  type="text"
                  value={cv.biodata[fieldKey].value}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      biodata: {
                        ...p.biodata,
                        [fieldKey]: { ...p.biodata[fieldKey], value: e.target.value },
                      },
                    }))
                  }
                  placeholder={ph}
                  className={inputCls}
                />
              </FieldToggleRow>
            ))}

            <CustomFieldsList
              items={cv.biodata.customFields}
              onChange={(customFields) =>
                onChange((p) => ({
                  ...p,
                  biodata: { ...p.biodata, customFields },
                }))
              }
              addButtonLabel="+ Add Custom Personal Field"
              labelPlaceholder="Personal Attribute"
              valuePlaceholder="Value"
            />
          </SectionAccordion>
        );
      }

      case 'addresses': {
        const renderAddrFields = (
          which: 'present' | 'permanent',
          block: AddressBlock
        ) => {
          const updateAddr = (patch: Partial<AddressBlock>) => {
            onChange((p) => ({
              ...p,
              addresses: {
                ...p.addresses,
                [which]: { ...p.addresses[which], ...patch },
              },
            }));
          };

          const fields: { key: keyof Omit<AddressBlock, 'enabled'>; label: string }[] =
            [
              { key: 'careOf', label: 'Care Of (C/O)' },
              { key: 'villageRoad', label: 'Village / Road / House' },
              { key: 'wardUnion', label: 'Ward / Union' },
              { key: 'postOffice', label: 'Post Office' },
              { key: 'postCode', label: 'Post Code' },
              { key: 'upazila', label: 'Upazila / Thana' },
              { key: 'district', label: 'District' },
              { key: 'division', label: 'Division' },
            ];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={block[f.key]}
                    onChange={(e) => updateAddr({ [f.key]: e.target.value })}
                    placeholder={f.label}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          );
        };

        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Address Details"
            subtitle="Panel I · Structured Present & Permanent Addresses"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.addresses.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({
                ...p,
                addresses: { ...p.addresses, enabled },
              }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            <FieldToggleRow
              label="Present Address"
              checked={cv.addresses.present.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  addresses: {
                    ...p.addresses,
                    present: { ...p.addresses.present, enabled },
                  },
                }))
              }
            >
              {renderAddrFields('present', cv.addresses.present)}
            </FieldToggleRow>

            <FieldToggleRow
              label="Permanent Address"
              checked={cv.addresses.permanent.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  addresses: {
                    ...p.addresses,
                    permanent: { ...p.addresses.permanent, enabled },
                  },
                }))
              }
              rightAction={
                cv.addresses.permanent.enabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange((p) => ({
                        ...p,
                        addresses: {
                          ...p.addresses,
                          permanent: {
                            ...p.addresses.present,
                            enabled: true,
                          },
                        },
                      }));
                      onNotify?.('Copied Present Address to Permanent Address');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors whitespace-nowrap"
                  >
                    <Copy className="w-3 h-3" />
                    Same as Present Address
                  </button>
                ) : null
              }
            >
              {renderAddrFields('permanent', cv.addresses.permanent)}
            </FieldToggleRow>

            <CustomFieldsList
              items={cv.addresses.customFields}
              onChange={(customFields) =>
                onChange((p) => ({
                  ...p,
                  addresses: { ...p.addresses, customFields },
                }))
              }
              addButtonLabel="+ Add Custom Address Field"
              labelPlaceholder="Address Label"
              valuePlaceholder="Address Details"
            />
          </SectionAccordion>
        );
      }

      case 'references': {
        const updateRef = (rid: string, patch: Partial<ReferenceItem>) => {
          onChange((p) => ({
            ...p,
            references: {
              ...p.references,
              items: p.references.items.map((r) =>
                r.id === rid ? { ...r, ...patch } : r
              ),
            },
          }));
        };

        const addRef = () => {
          onChange((p) => ({
            ...p,
            references: {
              ...p.references,
              items: [
                ...p.references.items,
                {
                  id: uid('ref'),
                  enabled: true,
                  name: '',
                  designation: '',
                  organization: '',
                  phone: '',
                  email: '',
                },
              ],
            },
          }));
        };

        const removeRef = (rid: string) => {
          onChange((p) => ({
            ...p,
            references: {
              ...p.references,
              items: p.references.items.filter((r) => r.id !== rid),
            },
          }));
        };

        return (
          <SectionAccordion
            key={id}
            code={code}
            title="References"
            subtitle="Panel J1 · Verifiable academic & professional referees"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.references.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({
                ...p,
                references: { ...p.references, enabled },
              }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            {cv.references.items.map((refItem, idx) => (
              <div
                key={refItem.id}
                className={`rounded-md border p-3 space-y-2 ${
                  refItem.enabled
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-200/70 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <ToggleCheck
                    checked={refItem.enabled}
                    onChange={(enabled) => updateRef(refItem.id, { enabled })}
                    label={`Reference ${String(idx + 1).padStart(2, '0')}${
                      refItem.name.trim() ? `: ${refItem.name}` : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRef(refItem.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Delete reference"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {refItem.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={refItem.name}
                      onChange={(e) =>
                        updateRef(refItem.id, { name: e.target.value })
                      }
                      placeholder="Full Name"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={refItem.designation}
                      onChange={(e) =>
                        updateRef(refItem.id, { designation: e.target.value })
                      }
                      placeholder="Designation / Title"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={refItem.organization}
                      onChange={(e) =>
                        updateRef(refItem.id, { organization: e.target.value })
                      }
                      placeholder="Organization / Department"
                      className={`${inputCls} sm:col-span-2`}
                    />
                    <input
                      type="text"
                      value={refItem.phone}
                      onChange={(e) =>
                        updateRef(refItem.id, { phone: e.target.value })
                      }
                      placeholder="Phone Number"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={refItem.email}
                      onChange={(e) =>
                        updateRef(refItem.id, { email: e.target.value })
                      }
                      placeholder="Email Address"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addRef}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Reference
            </button>

            <CustomFieldsList
              items={cv.references.customFields}
              onChange={(customFields) =>
                onChange((p) => ({
                  ...p,
                  references: { ...p.references, customFields },
                }))
              }
              addButtonLabel="+ Add Custom Reference Note"
              labelPlaceholder="Label"
              valuePlaceholder="Value"
            />
          </SectionAccordion>
        );
      }

      case 'enclosures': {
        const updateEnc = (eid: string, patch: Partial<EnclosureItem>) => {
          onChange((p) => ({
            ...p,
            enclosures: {
              ...p.enclosures,
              items: p.enclosures.items.map((it) =>
                it.id === eid ? { ...it, ...patch } : it
              ),
            },
          }));
        };

        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Supporting Documents & Enclosures"
            subtitle="Panel J2 · Bulleted checklist of attached hard/soft copies"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.enclosures.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({
                ...p,
                enclosures: { ...p.enclosures, enabled },
              }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            <div className="space-y-2">
              {cv.enclosures.items.map((enc) => (
                <div key={enc.id} className="flex items-center gap-2">
                  <ToggleCheck
                    checked={enc.enabled}
                    onChange={(enabled) => updateEnc(enc.id, { enabled })}
                  />
                  <input
                    type="text"
                    disabled={!enc.enabled}
                    value={enc.label}
                    onChange={(e) =>
                      updateEnc(enc.id, { label: e.target.value })
                    }
                    placeholder="Document description..."
                    className={`${inputCls} ${!enc.enabled ? 'opacity-50' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange((p) => ({
                        ...p,
                        enclosures: {
                          ...p.enclosures,
                          items: p.enclosures.items.filter((x) => x.id !== enc.id),
                        },
                      }))
                    }
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded shrink-0"
                    title="Delete enclosure"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                onChange((p) => ({
                  ...p,
                  enclosures: {
                    ...p.enclosures,
                    items: [
                      ...p.enclosures.items,
                      { id: uid('enc'), enabled: true, label: '' },
                    ],
                  },
                }))
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Enclosure Item
            </button>
          </SectionAccordion>
        );
      }

      case 'declaration':
        return (
          <SectionAccordion
            key={id}
            code={code}
            title="Authenticity Declaration & Signature"
            subtitle="Panel J3 · Statement, date & digital/typed signature"
            isOpen={!!openPanels[id]}
            onToggleOpen={() => toggleOpen(id)}
            sectionEnabled={cv.declaration.enabled}
            onToggleSection={(enabled) =>
              onChange((p) => ({
                ...p,
                declaration: { ...p.declaration, enabled },
              }))
            }
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={() => moveSection(id, -1)}
            onMoveDown={() => moveSection(id, 1)}
          >
            <FieldToggleRow
              label="Authenticity Declaration Statement"
              checked={cv.declaration.statementEnabled !== false}
              onToggle={(statementEnabled) =>
                onChange((p) => ({
                  ...p,
                  declaration: { ...p.declaration, statementEnabled },
                }))
              }
            >
              <textarea
                rows={3}
                value={cv.declaration.statement}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    declaration: { ...p.declaration, statement: e.target.value },
                  }))
                }
                placeholder="Write declaration statement..."
                className={textareaCls}
              />
            </FieldToggleRow>

            <FieldToggleRow
              label="Declaration Date"
              checked={cv.declaration.date.enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  declaration: {
                    ...p.declaration,
                    date: { ...p.declaration.date, enabled },
                  },
                }))
              }
            >
              <input
                type="text"
                value={cv.declaration.date.value}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    declaration: {
                      ...p.declaration,
                      date: { ...p.declaration.date, value: e.target.value },
                    },
                  }))
                }
                placeholder="e.g., 20 November 2026"
                className={inputCls}
              />
            </FieldToggleRow>

            <FieldToggleRow
              label="Applicant Signature & Name Block"
              checked={cv.declaration.signatureEnabled !== false}
              onToggle={(signatureEnabled) =>
                onChange((p) => ({
                  ...p,
                  declaration: { ...p.declaration, signatureEnabled },
                }))
              }
              rightAction={
                cv.declaration.signatureEnabled !== false ? (
                  <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        onChange((p) => ({
                          ...p,
                          declaration: { ...p.declaration, signatureMode: 'typed' },
                        }))
                      }
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                        cv.declaration.signatureMode === 'typed'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Typed
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange((p) => ({
                          ...p,
                          declaration: { ...p.declaration, signatureMode: 'image' },
                        }))
                      }
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                        cv.declaration.signatureMode === 'image'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      PNG / Image
                    </button>
                  </div>
                ) : null
              }
            >
              <div className="space-y-2.5">
                {cv.declaration.signatureMode === 'typed' ? (
                  <input
                    type="text"
                    value={cv.declaration.typedSignature}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        declaration: {
                          ...p.declaration,
                          typedSignature: e.target.value,
                        },
                      }))
                    }
                    placeholder="Type your signature (renders cleanly above signature line)"
                    className={inputCls}
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={sigInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleSignatureUpload}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => sigInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {cv.declaration.signatureImageUrl
                          ? 'Replace Signature'
                          : 'Upload Signature PNG/JPG'}
                      </button>
                      {cv.declaration.signatureImageUrl && (
                        <>
                          <button
                            type="button"
                            onClick={handleCleanSignatureBg}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition-colors"
                            title="Strip light paper background for transparent ink"
                          >
                            <Eraser className="w-3.5 h-3.5" />
                            Remove White BG
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChange((p) => ({
                                ...p,
                                declaration: {
                                  ...p.declaration,
                                  signatureImageUrl: '',
                                },
                              }))
                            }
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                    {cv.declaration.signatureImageUrl && (
                      <div className="h-14 border border-slate-200 rounded bg-slate-50 flex items-center justify-center p-2">
                        <img
                          src={cv.declaration.signatureImageUrl}
                          alt="Signature preview"
                          referrerPolicy="no-referrer"
                          className="max-h-10 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Printed Name Below Line (optional override; defaults to Full Name)
                  </label>
                  <input
                    type="text"
                    value={cv.declaration.applicantNameOverride}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        declaration: {
                          ...p.declaration,
                          applicantNameOverride: e.target.value,
                        },
                      }))
                    }
                    placeholder={
                      cv.header.fullNameEn.value || 'Applicant Full Name (UPPERCASE)'
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </FieldToggleRow>
          </SectionAccordion>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Quick Expand/Collapse Bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
        <span>Uncheck any field to omit it completely from CV & PDF</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="hover:text-slate-900 font-medium underline-offset-2 hover:underline"
          >
            Expand All
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="hover:text-slate-900 font-medium underline-offset-2 hover:underline"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* PANEL A: Header, Identity & High-DPI Photo Studio */}
      <SectionAccordion
        code="P-01"
        title="Header, Identity & High-DPI Photo Studio"
        subtitle="Panel A · Name, role headline, contact points & 300 DPI photo"
        isOpen={!!openPanels.panelA}
        onToggleOpen={() => toggleOpen('panelA')}
      >
        <PhotoStudio
          photo={cv.photo}
          onChange={(photo) => onChange((p) => ({ ...p, photo }))}
          onNotify={onNotify}
        />

        <div className="grid grid-cols-1 gap-2">
          {(
            [
              ['fullNameEn', 'Full Name (English)', 'e.g., Tariqul Islam Tanvir'],
              ['fullNameBn', 'Full Name (Bangla)', 'e.g., তারিকুল ইসলাম তানভীর'],
              [
                'headline',
                'Professional Headline / Target Role',
                'e.g., Administrative & Digital Operations Specialist',
              ],
              ['primaryMobile', 'Primary Mobile Number', 'e.g., +880 1712-458930'],
              ['altMobile', 'Alternative Mobile Number', 'e.g., +880 1911-884210'],
              ['email', 'Email Address', 'e.g., name@example.com'],
              [
                'portfolioUrl',
                'Portfolio / GitHub / Website URL',
                'e.g., https://github.com/username',
              ],
              [
                'secondaryUrl',
                'Secondary Link (Live App / LinkedIn / Behance)',
                'e.g., https://linkedin.com/in/username',
              ],
              ['cityCountry', 'Current City & Country', 'e.g., Dhaka, Bangladesh'],
            ] as const
          ).map(([fieldKey, label, ph]) => (
            <FieldToggleRow
              key={fieldKey}
              label={label}
              checked={cv.header[fieldKey].enabled}
              onToggle={(enabled) =>
                onChange((p) => ({
                  ...p,
                  header: {
                    ...p.header,
                    [fieldKey]: { ...p.header[fieldKey], enabled },
                  },
                }))
              }
              rightAction={
                fieldKey === 'headline' &&
                cv.header.headline.enabled &&
                cv.header.headline.value.trim() !==
                  SECTOR_CONFIGS[cv.sector].headline ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange((p) => ({
                        ...p,
                        header: {
                          ...p.header,
                          headline: {
                            ...p.header.headline,
                            value: SECTOR_CONFIGS[p.sector].headline,
                          },
                        },
                      }));
                      onNotify?.(
                        `Headline updated for ${SECTOR_CONFIGS[cv.sector].shortLabel}`
                      );
                    }}
                    className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors whitespace-nowrap"
                  >
                    Use Sector Preset
                  </button>
                ) : null
              }
            >
              <input
                type="text"
                value={cv.header[fieldKey].value}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    header: {
                      ...p.header,
                      [fieldKey]: { ...p.header[fieldKey], value: e.target.value },
                    },
                  }))
                }
                placeholder={ph}
                className={inputCls}
              />
            </FieldToggleRow>
          ))}
        </div>

        <CustomFieldsList
          items={cv.header.customFields}
          onChange={(customFields) =>
            onChange((p) => ({ ...p, header: { ...p.header, customFields } }))
          }
          addButtonLabel="+ Add Custom Header Field"
          labelPlaceholder="Contact Label (e.g., Skype / WhatsApp)"
          valuePlaceholder="Value or URL"
        />
      </SectionAccordion>

      {/* Panels B–J rendered in active Section Priority Order */}
      {builtInIds.map((secId) => {
        const idx = cv.sectionOrder.indexOf(secId);
        return renderBuiltInPanel(secId, idx);
      })}

      {/* Custom Dynamic Section Creator */}
      <CustomSectionsEditor
        customSections={cv.customSections}
        sectionOrder={cv.sectionOrder}
        onUpdateCustomSections={(customSections) =>
          onChange((p) => ({ ...p, customSections }))
        }
        onAddCustomSection={handleAddCustomSection}
        onDeleteCustomSection={handleDeleteCustomSection}
        onMoveSection={moveSection}
      />
    </div>
  );
};
