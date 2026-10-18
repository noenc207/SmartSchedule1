import React from 'react';
import { XCircle, AlertCircle } from 'lucide-react';

export interface MobileFormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  isTextarea?: boolean;
  rows?: number;
  onClear?: () => void;
  rightElement?: React.ReactNode;
}

export function MobileFormField({
  label,
  error,
  helperText,
  isTextarea = false,
  rows = 3,
  value,
  onClear,
  rightElement,
  className = '',
  required,
  id,
  ...props
}: MobileFormFieldProps) {
  const inputId = id || `m-field-${(label || 'field').toLowerCase().replace(/\s+/g, '-')}`;

  const baseInputClasses = `w-full px-3.5 py-3 rounded-xl border bg-[var(--m-surface)] text-[var(--m-text-primary)] placeholder:text-[var(--m-text-muted)] text-[0.9375rem] transition-colors outline-none focus:border-[var(--m-brand-primary)] focus:ring-2 focus:ring-[var(--m-brand-soft)] ${
    error
      ? 'border-[var(--m-campus-red)] focus:border-[var(--m-campus-red)] focus:ring-red-100'
      : 'border-[var(--m-border)]'
  } ${isTextarea ? '' : 'h-[46px]'} ${className}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-bold uppercase tracking-wider text-[var(--m-text-secondary)]"
        >
          {label} {required && <span className="text-[var(--m-brand-primary)]">*</span>}
        </label>
        {helperText && !error && (
          <span className="text-[11px] text-[var(--m-text-muted)]">{helperText}</span>
        )}
      </div>

      <div className="relative flex items-center w-full">
        {isTextarea ? (
          <textarea
            id={inputId}
            rows={rows}
            value={value}
            className={`${baseInputClasses} resize-none`}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={inputId}
            value={value}
            className={`${baseInputClasses} ${onClear && value ? 'pr-10' : ''}`}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {onClear && value && !isTextarea && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]"
            aria-label="Xóa nội dung"
          >
            <XCircle size={16} />
          </button>
        )}

        {rightElement && <div className="absolute right-3">{rightElement}</div>}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--m-campus-red)] mt-0.5 font-medium">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
