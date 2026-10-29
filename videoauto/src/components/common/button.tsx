import type { ButtonProps } from "./types";
import { Spinner } from "./spinner";
import "./common.css";

export function Button({
  loading = false,
  danger = false,
  variant = "primary",
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ui-button ui-button--${variant}${danger ? " ui-button--danger" : ""}${className ? ` ${className}` : ""}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
