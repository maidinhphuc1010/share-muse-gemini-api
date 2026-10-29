import type { ModalProps } from "./types";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./common.css";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  closeOnOverlay = true,
  className = "",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className="ui-overlay"
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`ui-modal${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Dialog"}
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
        {footer && <footer className="ui-modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
