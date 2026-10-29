import type { ReactNode } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import "./common.css";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button danger={danger} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
