interface PaginationProps {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, disabled, onPageChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn--ghost"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Prev
      </button>
      <span className="pagination__info">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="btn btn--ghost"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}

export default Pagination;
