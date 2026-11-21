import React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { CustomFieldItem, CustomSection } from '../types/cv';
import { uid } from '../utils/imageAndPdf';
import { ToggleCheck } from './ToggleSwitch';

interface CustomFieldsListProps {
  items: CustomFieldItem[];
  onChange: (next: CustomFieldItem[]) => void;
  addButtonLabel?: string;
  labelPlaceholder?: string;
  valuePlaceholder?: string;
}

export const CustomFieldsList: React.FC<CustomFieldsListProps> = ({
  items,
  onChange,
  addButtonLabel = '+ Add Custom Field',
  labelPlaceholder = 'Field Label / Heading',
  valuePlaceholder = 'Field Value',
}) => {
  const addField = () => {
    onChange([
      ...items,
      { id: uid('cf'), enabled: true, label: '', value: '' },
    ]);
  };

  const updateField = (id: string, patch: Partial<CustomFieldItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeField = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-2 pt-1">
      {items.map((field) => (
        <div
          key={field.id}
          className={`rounded-md border p-2.5 space-y-2 ${
            field.enabled
              ? 'bg-white border-slate-200'
              : 'bg-slate-50 border-slate-200/60 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <ToggleCheck
              checked={field.enabled}
              onChange={(enabled) => updateField(field.id, { enabled })}
              label={field.label.trim() || 'Custom Field'}
            />
            <button
              type="button"
              onClick={() => removeField(field.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete custom field"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {field.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-2">
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder={labelPlaceholder}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateField(field.id, { value: e.target.value })}
                placeholder={valuePlaceholder}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {addButtonLabel.replace(/^\+\s*/, '')}
      </button>
    </div>
  );
};

interface CustomSectionsEditorProps {
  customSections: CustomSection[];
  sectionOrder: string[];
  onUpdateCustomSections: (next: CustomSection[]) => void;
  onAddCustomSection: (layout: CustomSection['layout']) => void;
  onDeleteCustomSection: (sectionId: string) => void;
  onMoveSection: (sectionKey: string, dir: -1 | 1) => void;
}

export const CustomSectionsEditor: React.FC<CustomSectionsEditorProps> = ({
  customSections,
  sectionOrder,
  onUpdateCustomSections,
  onAddCustomSection,
  onDeleteCustomSection,
  onMoveSection,
}) => {
  const updateSection = (id: string, patch: Partial<CustomSection>) => {
    onUpdateCustomSections(
      customSections.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec))
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-display font-semibold text-slate-900">
            Custom Sections Creator
          </h3>
          <p className="text-[11px] text-slate-500">
            Add titled sections (Key-Value Table, Bullet List, or 2-Column Grid) and
            reorder them anywhere in your CV.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAddCustomSection('keyvalue')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Section
          </button>
        </div>
      </div>

      {customSections.length > 0 && (
        <div className="space-y-3 pt-1">
          {customSections.map((sec) => {
            const key = `custom_${sec.id}`;
            const orderIdx = sectionOrder.indexOf(key);
            return (
              <div
                key={sec.id}
                className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <ToggleCheck
                    checked={sec.enabled}
                    onChange={(enabled) => updateSection(sec.id, { enabled })}
                    label={sec.title.trim() || 'Untitled Custom Section'}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    {orderIdx !== -1 && (
                      <span className="text-[11px] font-mono-tabular text-slate-400 mr-1">
                        Pos {orderIdx + 1}/{sectionOrder.length}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={orderIdx <= 0}
                      onClick={() => onMoveSection(key, -1)}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30"
                      title="Move section up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={orderIdx === -1 || orderIdx >= sectionOrder.length - 1}
                      onClick={() => onMoveSection(key, 1)}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30"
                      title="Move section down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCustomSection(sec.id)}
                      className="p-1 rounded text-red-600 hover:bg-red-50"
                      title="Delete custom section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {sec.enabled && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-2">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) =>
                          updateSection(sec.id, { title: e.target.value })
                        }
                        placeholder="Section Title (e.g., Certifications & Training)"
                        className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                      <select
                        value={sec.layout}
                        onChange={(e) =>
                          updateSection(sec.id, {
                            layout: e.target.value as CustomSection['layout'],
                          })
                        }
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                      >
                        <option value="keyvalue">Key-Value Table</option>
                        <option value="bullets">Bullet List</option>
                        <option value="grid">2-Column Custom Grid</option>
                      </select>
                    </div>

                    <CustomFieldsList
                      items={sec.items}
                      onChange={(items) => updateSection(sec.id, { items })}
                      addButtonLabel={
                        sec.layout === 'bullets' ? '+ Add Bullet Item' : '+ Add Row'
                      }
                      labelPlaceholder={
                        sec.layout === 'bullets'
                          ? 'Highlight Label (optional)'
                          : 'Attribute / Heading'
                      }
                      valuePlaceholder={
                        sec.layout === 'bullets'
                          ? 'Bullet point description...'
                          : 'Details / Value'
                      }
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
