import "./common.css";

export function Skeleton({
  width,
  height = 16,
  circle = false,
  className = "",
}: {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`ui-skeleton${circle ? " ui-skeleton--circle" : ""}${className ? ` ${className}` : ""}`}
      style={{ width, height }}
    />
  );
}
