import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./common.css";

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className="ui-overlay ui-drawer-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className={`ui-drawer ui-drawer--${side}${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Panel"}
      >
        {title && (
          <header className="ui-modal-header">
            <h2>{title}</h2>
            <button
              className="ui-icon-button"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </header>
        )}
        <div className="ui-modal-body">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
