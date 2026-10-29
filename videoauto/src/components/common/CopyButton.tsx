import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Không thể sao chép nội dung.");
}

export default function CopyButton({
  text,
  label = "Sao chép",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await copyText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className={`chat-copy-button ${className}`}
      onClick={() => void handleCopy()}
      aria-label={copied ? "Đã sao chép" : label}
      title={copied ? "Đã sao chép" : label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Đã sao chép" : label}</span>
    </button>
  );
}
