import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { dismissToast, subscribeToasts, toastItems } from "./toastStore";
import type { ToastEntry } from "./toastStore";
import "./common.css";

export function Toast({
  position = "top-right",
  duration = 4000,
  className = "",
}: {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  duration?: number;
  className?: string;
}) {
  const [items, setItems] = useState<ToastEntry[]>(toastItems);
  useEffect(() => subscribeToasts(setItems), []);
  useEffect(() => {
    if (duration <= 0) return;
    const timers = items
      .filter((item) => item.duration === undefined)
      .map((item) => window.setTimeout(() => dismissToast(item.id), duration));
    return () => timers.forEach(window.clearTimeout);
  }, [duration, items]);
  return createPortal(
    <div
      className={`ui-toasts ui-toasts--${position}${className ? ` ${className}` : ""}`}
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`ui-toast ui-toast--${item.variant ?? "info"}`}
          role={item.variant === "error" ? "alert" : "status"}
        >
          <div>
            {item.title && <strong>{item.title}</strong>}
            <span>{item.message}</span>
          </div>
          <button
            className="ui-icon-button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
