import type { SelectProps } from "./types";
import "./common.css";

export function Select({
  label,
  error,
  options = [],
  placeholder,
  id,
  className = "",
  children,
  ...props
}: SelectProps) {
  const selectId =
    id ??
    (label
      ? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      : undefined);
  return (
    <div className="ui-field">
      {label && (
        <label className="ui-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        aria-invalid={!!error || undefined}
        className={`ui-control${error ? " ui-invalid" : ""}${className ? ` ${className}` : ""}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
        {children}
      </select>
      {error && <small className="ui-error">{error}</small>}
    </div>
  );
}
