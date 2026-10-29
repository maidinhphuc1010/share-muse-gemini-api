import type { SwitchProps } from "./types";
import "./common.css";

export function Switch({ label, className = "", ...props }: SwitchProps) {
  return (
    <label className={`ui-switch${className ? ` ${className}` : ""}`}>
      <input {...props} type="checkbox" role="switch" />
      <span className="ui-switch-track" />
      {label && <span>{label}</span>}
    </label>
  );
}
