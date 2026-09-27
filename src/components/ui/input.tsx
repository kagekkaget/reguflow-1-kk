import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(baseField, error && "border-red-400 focus:border-red-500 focus:ring-red-500/30", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseField, "resize-y", error && "border-red-400 focus:border-red-500 focus:ring-red-500/30", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(baseField, "pr-9 appearance-none bg-no-repeat", error && "border-red-400 focus:border-red-500 focus:ring-red-500/30", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e\")",
        backgroundPosition: "right 0.6rem center",
        backgroundSize: "1.1rem",
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

// ---- Field wrapper (label + error) ------------------------------------------

export interface FieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="label-text">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="helper-text">{hint}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}

// ---- Checkbox ----------------------------------------------------------------

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-600 shadow-sm focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-0",
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={inputId} className="cursor-pointer select-none">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            {description && (
              <span className="block text-xs text-slate-500">{description}</span>
            )}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
