import type { ReactNode } from "react";

export type ToastMessage = {
  id?: string | number;
  title?: string;
  message: ReactNode;
  variant?: "success" | "error" | "warning" | "info";
  duration?: number;
};
export type ToastEntry = ToastMessage & { id: string | number };
let toastSequence = 0;
let toastListeners: ((items: ToastEntry[]) => void)[] = [];
export let toastItems: ToastEntry[] = [];
function publishToasts() {
  toastListeners.forEach((listener) => listener([...toastItems]));
}
function addToast(input: ToastMessage) {
  const id = input.id ?? ++toastSequence;
  toastItems = [...toastItems, { ...input, id }];
  publishToasts();
  if (input.duration !== 0)
    window.setTimeout(() => dismissToast(id), input.duration ?? 4000);
  return id;
}
export function dismissToast(id: string | number) {
  toastItems = toastItems.filter((item) => item.id !== id);
  publishToasts();
}
export function subscribeToasts(listener: (items: ToastEntry[]) => void) {
  toastListeners = [...toastListeners, listener];
  return () => {
    toastListeners = toastListeners.filter((item) => item !== listener);
  };
}
export const toast = {
  success: (message: ReactNode, title?: string) =>
    addToast({ message, title, variant: "success" }),
  error: (message: ReactNode, title?: string) =>
    addToast({ message, title, variant: "error" }),
  warning: (message: ReactNode, title?: string) =>
    addToast({ message, title, variant: "warning" }),
  info: (message: ReactNode, title?: string) =>
    addToast({ message, title, variant: "info" }),
  dismiss: dismissToast,
};
