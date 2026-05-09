"use client";

import { useState, useRef, useCallback } from "react";

interface TableSearchProps {
  search?: string;
  setSearch?: (search: string) => void;
  placeholder?: string;
  className?: string;
}

const TableSearch = ({
  search: externalSearch,
  setSearch: externalSetSearch,
  placeholder = "Search...",
  className = "w-full md:w-auto",
}: TableSearchProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use the external search value if provided, otherwise use internal
  const displayValue = externalSearch !== undefined ? externalSearch : "";

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (externalSetSearch) {
      externalSetSearch(value);
    }
  }, [externalSetSearch]);

  const handleClear = useCallback(() => {
    if (externalSetSearch) {
      externalSetSearch("");
    }
    inputRef.current?.focus();
  }, [externalSetSearch]);

  return (
    <div
      className={`${className} relative flex items-center gap-2 text-sm rounded-xl border-2 transition-all duration-200 ${
        isFocused
          ? "border-[var(--brand-color,#e35336)] bg-white dark:bg-gray-800 shadow-sm"
          : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
      }`}
    >
      {/* Search Icon */}
      <div className="pl-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-colors duration-200 ${
            isFocused ? "text-[var(--brand-color,#e35336)]" : "text-gray-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full bg-transparent outline-none py-1.5 pr-14 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
      />

      {/* Clear Button */}
      {displayValue && (
        <button
          type="button"
          onClick={handleClear}
          className="pr-3 text-gray-400 hover:text-[var(--brand-color,#e35336)] transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default TableSearch;
