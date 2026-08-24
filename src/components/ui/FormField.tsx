import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const fieldBase =
  "w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1";
const errorBase = "border-red-500/60";

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-sans text-sm font-medium text-navy-deep"
    >
      {children}
      {required ? <span className="text-gold"> *</span> : null}
    </label>
  );
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="font-sans text-xs text-red-600">
      {message}
    </p>
  );
}

type BaseFieldProps = {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Applied to the field's outer wrapper (e.g. grid col-span utilities). */
  className?: string;
};

export function TextField({
  name,
  label,
  error,
  required,
  hint,
  className = "",
  ...rest
}: BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "className">) {
  const errorId = `${name}-error`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      {hint ? <p className="font-sans text-xs text-charcoal/60">{hint}</p> : null}
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        required={required}
        className={`${fieldBase} ${error ? errorBase : ""}`}
        {...rest}
      />
      <ErrorText id={errorId} message={error} />
    </div>
  );
}

export function TextareaField({
  name,
  label,
  error,
  required,
  hint,
  className = "",
  ...rest
}: BaseFieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id" | "className">) {
  const errorId = `${name}-error`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      {hint ? <p className="font-sans text-xs text-charcoal/60">{hint}</p> : null}
      <textarea
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        required={required}
        rows={4}
        className={`${fieldBase} ${error ? errorBase : ""}`}
        {...rest}
      />
      <ErrorText id={errorId} message={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  error,
  required,
  hint,
  options,
  placeholder,
  className = "",
  ...rest
}: BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id" | "className"> & {
    options: readonly { value: string; label: string }[];
    placeholder?: string;
  }) {
  const errorId = `${name}-error`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      {hint ? <p className="font-sans text-xs text-charcoal/60">{hint}</p> : null}
      <select
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        required={required}
        defaultValue=""
        className={`${fieldBase} ${error ? errorBase : ""}`}
        {...rest}
      >
        <option value="" disabled>
          {placeholder ?? "Select an option"}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ErrorText id={errorId} message={error} />
    </div>
  );
}
