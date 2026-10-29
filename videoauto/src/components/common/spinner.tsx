import "./common.css";

export function Spinner({
  size = "md",
  label = "Loading",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`ui-spinner ui-spinner--${size}${className ? ` ${className}` : ""}`}
      role="status"
      aria-label={label}
    />
  );
}
