import type { RadioOption } from "./types";
import "./common.css";

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  disabled,
  className = "",
}: {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`ui-radio-group${className ? ` ${className}` : ""}`}
      role="radiogroup"
    >
      {options.map((option) => (
        <label key={option.value} className="ui-check">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled || option.disabled}
            onChange={() => onChange?.(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
