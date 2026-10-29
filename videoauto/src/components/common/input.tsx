import type { InputProps } from "./types";
import "./common.css";

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId =
    id ??
    (label
      ? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      : undefined);
  return (
    <div className="ui-field">
      {label && (
        <label className="ui-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        aria-invalid={!!error || undefined}
        className={`ui-control${error ? " ui-invalid" : ""}${className ? ` ${className}` : ""}`}
      />
      {(error || hint) && (
        <small className={error ? "ui-error" : "ui-hint"}>
          {error ?? hint}
        </small>
      )}
    </div>
  );
}
