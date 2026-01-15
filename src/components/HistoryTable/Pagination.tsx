import { usePagination } from '../../lib/contexts/PaginationContext'

export const Pagination: React.FC = () => {
  const { currentPage, totalPages, changePage, currentPassSummaries } =
    usePagination()
  if (currentPassSummaries.length === 0) {
    return null
  }
  return (
    <div className="pagination-container">
      <div className="pagination-controls flex justify-center w-full gap-1">
        <button
          className="pagination-button"
          disabled={currentPage === 1}
          onClick={() => changePage(1)}
        >
          &laquo; First
        </button>
        <button
          className="pagination-button"
          disabled={currentPage === 1}
          onClick={() => changePage(currentPage - 1)}
        >
          &lt; Prev
        </button>

        {/* Page numbers */}
        {(() => {
          const pages = []
          const maxVisible = 5 // Max visible page numbers
          let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
          const endPage = Math.min(totalPages, startPage + maxVisible - 1)

          if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1)
          }

          for (let i = startPage; i <= endPage; i++) {
            pages.push(
              <button
                key={i}
                className={`pagination-button ${currentPage === i ? 'active' : ''}`}
                onClick={() => changePage(i)}
              >
                {i}
              </button>
            )
          }
          return pages
        })()}

        <button
          className="pagination-button"
          disabled={currentPage === totalPages}
          onClick={() => changePage(currentPage + 1)}
        >
          Next &gt;
        </button>
        <button
          className="pagination-button"
          disabled={currentPage === totalPages}
          onClick={() => changePage(totalPages)}
        >
          Last &raquo;
        </button>
      </div>
    </div>
  )
}
