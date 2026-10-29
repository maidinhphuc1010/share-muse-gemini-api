import "./common.css";

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  className = "",
}: {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`ui-progress-wrap${className ? ` ${className}` : ""}`}>
      {(label || showValue) && (
        <div className="ui-progress-label">
          <span>{label}</span>
          {showValue && <span>{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        className="ui-progress"
        role="progressbar"
        aria-valuenow={Math.min(max, Math.max(0, value))}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
