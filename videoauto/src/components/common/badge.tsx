import type { ReactNode } from "react";
import "./common.css";

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  return (
    <span
      className={`ui-badge ui-badge--${variant}${className ? ` ${className}` : ""}`}
    >
      {children}
    </span>
  );
}
