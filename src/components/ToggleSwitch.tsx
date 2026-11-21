import React from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Check } from 'lucide-react';

interface ToggleCheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

export const ToggleCheck: React.FC<ToggleCheckProps> = ({
  checked,
  onChange,
  label,
  ariaLabel,
  size = 'sm',
}) => {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel || label || 'Toggle inclusion'}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 shrink-0 ${
          size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'
        } ${
          checked
            ? 'bg-slate-900 border-slate-900 text-white'
            : 'bg-white border-slate-300 text-transparent hover:border-slate-500'
        }`}
      >
        <Check className={size === 'sm' ? 'w-3 h-3 stroke-[2.75]' : 'w-3.5 h-3.5 stroke-[2.75]'} />
      </button>
      {label && (
        <span
          className={`text-xs font-medium transition-colors ${
            checked ? 'text-slate-800' : 'text-slate-400 line-through'
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
};

interface FieldToggleRowProps {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  hint?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export const FieldToggleRow: React.FC<FieldToggleRowProps> = ({
  label,
  checked,
  onToggle,
  hint,
  rightAction,
  children,
}) => {
  return (
    <div
      className={`rounded-md border px-3 py-2.5 transition-colors ${
        checked
          ? 'bg-white border-slate-200'
          : 'bg-slate-50/70 border-slate-200/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ToggleCheck checked={checked} onChange={onToggle} label={label} />
          {hint && checked && (
            <span className="text-[11px] text-slate-400 truncate">{hint}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!checked && (
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              Omitted from CV
            </span>
          )}
          {rightAction}
        </div>
      </div>
      {checked && <div className="mt-2">{children}</div>}
    </div>
  );
};

interface SectionAccordionProps {
  code: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  sectionEnabled?: boolean;
  onToggleSection?: (enabled: boolean) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: React.ReactNode;
}

export const SectionAccordion: React.FC<SectionAccordionProps> = ({
  code,
  title,
  subtitle,
  isOpen,
  onToggleOpen,
  sectionEnabled,
  onToggleSection,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  children,
}) => {
  return (
    <section className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200/80">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-2.5 text-left min-w-0 flex-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
        >
          <span className="text-slate-500 shrink-0">
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
          <span className="text-[11px] font-mono-tabular font-semibold text-slate-500 shrink-0">
            {code}
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-display font-semibold text-slate-900 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {onMoveUp && (
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              title="Move section up"
              aria-label={`Move ${title} up`}
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              title="Move section down"
              aria-label={`Move ${title} down`}
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
          {typeof sectionEnabled === 'boolean' && onToggleSection && (
            <div className="pl-1.5 ml-1 border-l border-slate-200 flex items-center">
              <ToggleCheck
                size="md"
                checked={sectionEnabled}
                onChange={onToggleSection}
                ariaLabel={`Include ${title} section in CV`}
              />
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className={`p-3.5 space-y-2.5 ${
            sectionEnabled === false ? 'opacity-55' : ''
          }`}
        >
          {sectionEnabled === false && (
            <div className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5">
              This entire section is currently toggled off and will not appear in the CV preview or PDF.
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
};
