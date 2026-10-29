import type { CheckboxProps } from "./types";
import "./common.css";

export function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`ui-check${className ? ` ${className}` : ""}`}>
      <input {...props} type="checkbox" />
      {label}
    </label>
  );
}
