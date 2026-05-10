"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  page: number;
  setPage: (page: number) => void;
  totalPages?: number;
  className?: string;
}

const Pagination = ({
  page,
  setPage,
  totalPages = 10,
  className = "",
}: PaginationProps) => {
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      
      if (page <= 3) {
        start = 2;
        end = 4;
      }
      
      if (page >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }
      
      if (start > 2) {
        pages.push(-1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push(-2);
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--brand-color,#e35336)] text-white shadow-sm transition-all duration-150 hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {renderPageNumbers().map((pageNum, index) => {
          if (pageNum === -1 || pageNum === -2) {
            return (
              <span 
                key={`ellipsis-${index}`} 
                className="flex items-center justify-center w-8 h-8 text-gray-400"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
            );
          }
          
          return (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={`flex items-center justify-center w-8 h-8 text-sm font-medium rounded-md transition-all duration-150 ${
                page === pageNum
                  ? "bg-[var(--brand-color,#e35336)] text-white shadow-sm"
                  : "text-gray-600 hover:bg-[rgba(var(--brand-color-rgb),0.12)] hover:text-[var(--brand-color,#e35336)] active:bg-[rgba(var(--brand-color-rgb),0.18)]"
              }`}
              aria-label={`Go to page ${pageNum}`}
              aria-current={page === pageNum ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--brand-color,#e35336)] text-white shadow-sm transition-all duration-150 hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
