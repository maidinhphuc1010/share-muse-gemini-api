import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  danger?: boolean;
  variant?: "primary" | "secondary" | "ghost";
};

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export type SelectOption = { label: string; value: string; disabled?: boolean };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
};

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & { label: ReactNode };

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & { label?: ReactNode };

export type RadioOption = {
  label: ReactNode;
  value: string;
  disabled?: boolean;
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlay?: boolean;
  className?: string;
};

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
};
