import type { TextareaProps } from "./types";
import "./common.css";

export function Textarea({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const textareaId =
    id ??
    (label
      ? `textarea-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      : undefined);
  return (
    <div className="ui-field">
      {label && (
        <label className="ui-label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        {...props}
        id={textareaId}
        aria-invalid={!!error || undefined}
        className={`ui-control ui-textarea${error ? " ui-invalid" : ""}${className ? ` ${className}` : ""}`}
      />
      {(error || hint) && (
        <small className={error ? "ui-error" : "ui-hint"}>
          {error ?? hint}
        </small>
      )}
    </div>
  );
}
