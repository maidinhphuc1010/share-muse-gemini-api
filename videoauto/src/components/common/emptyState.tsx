import type { ReactNode } from "react";
import "./common.css";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ui-empty${className ? ` ${className}` : ""}`}>
      {icon && <div className="ui-empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}
