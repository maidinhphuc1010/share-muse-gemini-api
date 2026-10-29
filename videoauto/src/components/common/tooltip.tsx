import type { ReactNode } from "react";
import "./common.css";

export function Tooltip({
  content,
  children,
  className = "",
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`ui-tooltip${className ? ` ${className}` : ""}`}
      tabIndex={0}
    >
      <span className="ui-tooltip-trigger">{children}</span>
      <span role="tooltip" className="ui-tooltip-content">
        {content}
      </span>
    </span>
  );
}
