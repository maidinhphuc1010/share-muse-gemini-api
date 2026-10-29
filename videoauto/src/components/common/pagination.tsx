import "./common.css";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = "",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}) {
  if (totalPages <= 0) return null;
  const current = Math.min(totalPages, Math.max(1, page));
  const pages = new Set<number>([1, totalPages]);
  for (
    let n = Math.max(1, current - siblingCount);
    n <= Math.min(totalPages, current + siblingCount);
    n++
  )
    pages.add(n);
  const numbers = [...pages].sort((a, b) => a - b);
  return (
    <nav
      className={`ui-pagination${className ? ` ${className}` : ""}`}
      aria-label="Pagination"
    >
      <button
        className="ui-page-button"
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      {numbers.map((n, i) => (
        <span key={n}>
          {i > 0 && n - numbers[i - 1] > 1 && (
            <span className="ui-ellipsis">…</span>
          )}
          <button
            className={`ui-page-button${n === current ? " is-active" : ""}`}
            aria-current={n === current ? "page" : undefined}
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        className="ui-page-button"
        disabled={current === totalPages}
        onClick={() => onPageChange(current + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
