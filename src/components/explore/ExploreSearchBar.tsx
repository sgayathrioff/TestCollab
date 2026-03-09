"use client";

import { Search } from "lucide-react";

type FilterType = "all" | "workspaces" | "creators";

interface ExploreSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  isLoading?: boolean;
}

export function ExploreSearchBar({
  value,
  onChange,
  onSearch,
  activeFilter,
  onFilterChange,
  isLoading = false,
}: ExploreSearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All Results" },
    { key: "workspaces", label: "Workspaces" },
    { key: "creators", label: "Creators" },
  ];

  return (
    <div className="text-center max-w-3xl mx-auto mb-16 float-in">
      {/* Discover Badge */}
      <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full mb-6 shadow-sm border border-stone-100">
        <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
          Discover
        </span>
      </div>

      {/* Title */}
      <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-stone-900 mb-8">
        Find your next spark.
      </h1>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative group max-w-2xl mx-auto">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-lime-300 to-emerald-300 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        
        {/* Search Bar */}
        <div className="relative bg-white rounded-[32px] p-2 flex items-center shadow-lg border border-stone-100">
          <Search className="w-6 h-6 text-stone-400 ml-4" />
          <input
            type="text"
            placeholder="Search workspaces by name or tags, find creators..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent border-none px-4 py-4 text-lg focus:outline-none text-stone-900 placeholder:text-stone-400 font-medium"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#1c1917] text-white px-8 py-4 rounded-3xl font-bold hover:bg-stone-800 hover:scale-105 transition-all shadow-md flex-shrink-0 disabled:opacity-50"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {/* Filter Buttons */}
      <div className="flex justify-center gap-3 mt-6">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter.key
                ? "bg-[#1c1917] text-white shadow-md font-bold"
                : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Search Help */}
      <div className="text-center mt-4 text-sm text-stone-500">
        <p>💡 Search by workspace names or reference tags (e.g. "design", "react", "marketing")</p>
      </div>
    </div>
  );
}
