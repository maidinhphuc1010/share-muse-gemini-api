import type { ReactNode } from "react";
import "./common.css";

export function Card({
  children,
  title,
  footer,
  className = "",
  ...props
}: {
  children: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section
      {...props}
      className={`ui-card${className ? ` ${className}` : ""}`}
    >
      {title && <header className="ui-card-header">{title}</header>}
      <div className="ui-card-body">{children}</div>
      {footer && <footer className="ui-card-footer">{footer}</footer>}
    </section>
  );
}
